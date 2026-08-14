import { getElectronAPI } from '../lib/electron';

function escapeCsvCell(value: unknown): string {
    const text =
        value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
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

    if (electronAPI?.saveCsvFile) {
        const result = await electronAPI.saveCsvFile(content, filename);
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
