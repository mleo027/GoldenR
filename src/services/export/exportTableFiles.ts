/**
 * 表格导出副作用（service 层）：CSV / 对齐文本落盘或浏览器下载。
 *
 * 纯构建逻辑见 utils/exportTable，本文件只负责 I/O，
 * 使 utils 保持无副作用、可独立单测。
 */
import { getElectronAPI } from '../../lib/electron';
import { importExportRuntime } from '../../runtime/importExportFacade';
import { buildAlignedTextTable, buildCsvContent } from '../../utils/exportTable';

export type ExportCsvResult =
    | { saved: true; filePath: string }
    | { saved: false; reason: 'empty' | 'cancelled' };

export type ExportTextResult =
    | { saved: true; filePath: string }
    | { saved: false; reason: 'empty' | 'cancelled' };

function downloadInBrowser(content: string, mime: string, filename: string): string {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
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
    if (getElectronAPI()?.importExport.saveCsv) {
        const result = await importExportRuntime.saveCsv(content, filename);
        if (!result.saved) {
            return { saved: false, reason: 'cancelled' };
        }
        return { saved: true, filePath: result.filePath ?? filename };
    }

    const savedFilename = downloadInBrowser(
        content,
        'text/csv;charset=utf-8',
        filename.endsWith('.csv') ? filename : `${filename}.csv`,
    );
    return {
        saved: true,
        filePath: `浏览器默认下载目录 / ${savedFilename}`,
    };
}

export async function exportTableToText(
    data: Record<string, unknown>[],
    filename = 'response.txt',
): Promise<ExportTextResult> {
    if (data.length === 0) {
        return { saved: false, reason: 'empty' };
    }

    const content = buildAlignedTextTable(data);
    if (getElectronAPI()?.importExport.saveTxt) {
        const result = await importExportRuntime.saveTxt(content, filename);
        if (!result.saved) {
            return { saved: false, reason: 'cancelled' };
        }
        return { saved: true, filePath: result.filePath ?? filename };
    }

    const savedFilename = downloadInBrowser(
        content,
        'text/plain;charset=utf-8',
        filename.endsWith('.txt') ? filename : `${filename}.txt`,
    );
    return {
        saved: true,
        filePath: `浏览器默认下载目录 / ${savedFilename}`,
    };
}
