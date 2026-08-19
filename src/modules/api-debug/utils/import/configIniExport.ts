import type { ProjectData, TabData } from '../../types/workspace';
import { getElectronAPI } from '../../../../lib/electron';
import { parseKcbpAddress, splitHost } from '../kcbp/kcbpAddress';
import { getDefaultCaseName } from '../workspace/caseLabel';
import { escapeIniText } from './configIniCodec';

function buildCaseLine(caseItem: TabData, index: number): string | null {
    const parts = parseKcbpAddress(caseItem.address);
    const msgtype = parts.msgtype.trim();
    if (!msgtype) return null;

    const title = escapeIniText(
        (caseItem.name.trim() || getDefaultCaseName(index)).replace(/[\r\n]+/g, ' '),
    );
    const params = caseItem.params
        .filter((param) => param.type !== 'disabled' && param.name.trim())
        .map(
            (param) =>
                `${escapeIniText(param.name.trim())}:${escapeIniText(
                    param.value.replace(/\r?\n/g, ' ').trim(),
                )}`,
        )
        .join(',');

    const msgtypePart = escapeIniText(msgtype);
    return `${title}=${msgtypePart};${params}`;
}

export function buildConfigIniContent(project: ProjectData): string {
    const lines = ['[连接参数]'];
    const host =
        project.cases
            .map((caseItem) => parseKcbpAddress(caseItem.address).host)
            .find((value) => Boolean(value.trim())) ?? '';
    const { ip, port } = splitHost(host);

    if (ip) lines.push(`IPAddress=${ip}`);
    if (port) lines.push(`IPPort=${port}`);
    lines.push('');

    const caseLines = project.cases
        .map(buildCaseLine)
        .filter((line): line is string => line != null);
    lines.push(...caseLines);

    return `${lines.join('\r\n')}\r\n`;
}

export function hasExportableProjectCases(project: ProjectData): boolean {
    return project.cases.some((caseItem) =>
        Boolean(parseKcbpAddress(caseItem.address).msgtype.trim()),
    );
}

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
    const electronAPI = getElectronAPI();

    if (electronAPI?.importExport.saveIni) {
        const result = await electronAPI.importExport.saveIni(content, filename);
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
