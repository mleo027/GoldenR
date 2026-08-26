import { getElectronAPI } from '../lib/electron';

function stringifyExportValue(value: unknown): string {
    return value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
}

/** CJK 全角字符（汉字、全角标点、韩文等）按 2 个显示宽度计 */
const WIDE_CHAR_RE = /[\u2E80-\u9FFF\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFFEF]/;

export function displayWidth(text: string): number {
    let width = 0;
    for (const char of text) {
        width += WIDE_CHAR_RE.test(char) ? 2 : 1;
    }
    return width;
}

function padToWidth(text: string, width: number): string {
    return text + ' '.repeat(Math.max(0, width - displayWidth(text)));
}

function escapeCsvCell(value: unknown): string {
    const text = stringifyExportValue(value);
    if (/[",\n\r]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatByteSize(bytes: number): string {
    return formatBytes(bytes);
}

export function estimateDataSize(data: Record<string, unknown>[]): number {
    try {
        return new Blob([JSON.stringify(data)]).size;
    } catch {
        return 0;
    }
}

export function formatDataSize(data: Record<string, unknown>[]): string {
    return formatBytes(estimateDataSize(data));
}

export function buildCsvContent(data: Record<string, unknown>[]): string {
    const keys = Object.keys(data[0]);
    const lines = [
        keys.join(','),
        ...data.map((row) => keys.map((key) => escapeCsvCell(row[key])).join(',')),
    ];
    return `\uFEFF${lines.join('\n')}`;
}

/** 构建列对齐的纯文本表格：列宽取各列最大显示宽度，右侧补空格，列间两个空格 */
export function buildAlignedTextTable(data: Record<string, unknown>[]): string {
    const keys = Object.keys(data[0]);
    const rows = data.map((row) => keys.map((key) => stringifyExportValue(row[key])));
    const widths = keys.map((key, col) =>
        Math.max(displayWidth(key), ...rows.map((row) => displayWidth(row[col]))),
    );
    const lines = [
        keys.map((key, col) => padToWidth(key, widths[col])).join('  '),
        ...rows.map((row) => row.map((cell, col) => padToWidth(cell, widths[col])).join('  ')),
    ];
    return lines.map((line) => line.trimEnd()).join('\n');
}

export type ExportCsvResult =
    | { saved: true; filePath: string }
    | { saved: false; reason: 'empty' | 'cancelled' };

function downloadCsvInBrowser(content: string, filename: string): string {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    return anchor.download;
}

export async function exportTableToCsv(
    data: Record<string, unknown>[],
    filename = 'response.csv',
): Promise<ExportCsvResult> {
    if (data.length === 0) {
        return { saved: false, reason: 'empty' };
    }

    const content = buildCsvContent(data);
    const electronAPI = getElectronAPI();

    if (electronAPI?.importExport.saveCsv) {
        const result = await electronAPI.importExport.saveCsv(content, filename);
        if (!result.saved) {
            return { saved: false, reason: 'cancelled' };
        }
        return { saved: true, filePath: result.filePath ?? filename };
    }

    const savedFilename = downloadCsvInBrowser(content, filename);
    return {
        saved: true,
        filePath: `浏览器默认下载目录 / ${savedFilename}`,
    };
}
