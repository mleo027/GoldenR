/**
 * 将项目导出为 INI 的副作用封装（service 层）。
 *
 * 与 utils/import/configIniExport 的纯构建逻辑分离：
 * - utils 只负责生成 INI 文本（可单测、无副作用）
 * - 本文件负责走 runtime facade 落盘 / 浏览器下载
 */
import type { ProjectData } from '../../types/workspace';
import { getElectronAPI } from '../../../../lib/electron';
import { importExportRuntime } from '../../../../runtime/importExportFacade';
import {
    buildConfigIniContent,
    hasExportableProjectCases,
} from '../../utils/import/configIniExport';

export type ExportIniResult =
    | { saved: true; filePath: string }
    | { saved: false; reason: 'empty' | 'cancelled' | 'error'; error?: string };

function downloadIniInBrowser(content: string, filename: string): string {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename.endsWith('.ini') ? filename : `${filename}.ini`;
    anchor.click();
    URL.revokeObjectURL(url);
    return anchor.download;
}

export async function exportProjectToIni(
    project: ProjectData,
    filename = `${project.name || 'project'}.ini`,
): Promise<ExportIniResult> {
    if (!hasExportableProjectCases(project)) {
        return { saved: false, reason: 'empty' };
    }

    const content = buildConfigIniContent(project);
    if (getElectronAPI()?.importExport.saveIni) {
        const result = await importExportRuntime.saveIni(content, filename);
        if (!result.saved) {
            if (result.error) {
                return { saved: false, reason: 'error', error: result.error };
            }
            return { saved: false, reason: 'cancelled' };
        }
        return { saved: true, filePath: result.filePath ?? filename };
    }

    const savedFilename = downloadIniInBrowser(content, filename);
    return {
        saved: true,
        filePath: `浏览器默认下载目录 / ${savedFilename}`,
    };
}
