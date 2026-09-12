/**
 * 表格格式化纯函数（displayWidth / CSV / 对齐文本）。
 *
 * 无副作用：不触达 Electron / runtime / DOM。
 * 落盘与下载见 services/export/exportTableFiles。
 */

function stringifyExportValue(value: unknown): string {
    return value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
}

/** CJK 全角字符（汉字、全角标点、韩文谚文等）按 2 个显示宽度计；
 *  半角片假名（U+FF61–U+FF9F）为窄字符不计入 */
const WIDE_CHAR_RE =
    /[\u1100-\u11FF\u2E80-\u9FFF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF01-\uFF60\uFFE0-\uFFE6]/;

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

export function estimateDataSize(data: unknown[]): number {
    try {
        return new Blob([JSON.stringify(data)]).size;
    } catch {
        return 0;
    }
}

export function formatDataSize(data: unknown[]): string {
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
    if (data.length === 0) {
        return '';
    }
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
