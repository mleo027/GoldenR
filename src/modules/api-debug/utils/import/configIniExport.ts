/**
 * 项目 → INI 文本的纯构建逻辑。
 *
 * 无副作用：不触达 Electron / runtime / DOM。
 * 落盘与下载副作用见 services/import/exportProjectIni。
 */
import type { ProjectData, TabData } from '../../types/workspace';
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
