import type { ParamItem, TabData } from '../../types/workspace';
import { createParamItem } from '../workspace/paramItem';
import { createEmptyCase } from '../../constants/workspace';
import {
    DEFAULT_KCBP_QUEUE,
    DEFAULT_KCBP_TIMEOUT,
    serializeKcbpAddress,
} from '../kcbp/kcbpAddress';
import { findUnescapedChar, splitUnescaped, unescapeIniText } from './configIniCodec';

/** 从 Config.ini [连接参数] 解析 host，如 127.0.0.1:21000 */
export function parseIniConnectionHost(content: string): string {
    let ip = '';
    let port = '';

    for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('[')) continue;

        const ipMatch = trimmed.match(/^IPAddress\s*=\s*(.+)$/i);
        if (ipMatch) ip = ipMatch[1].trim();

        const portMatch = trimmed.match(/^IPPort\s*=\s*(.+)$/i);
        if (portMatch) port = portMatch[1].trim();
    }

    if (ip && port) return `${ip}:${port}`;
    return ip;
}

function parseIniParams(paramsStr: string): ParamItem[] {
    if (!paramsStr) return [];

    const params: ParamItem[] = [];
    for (const segment of splitUnescaped(paramsStr, ',')) {
        const trimmed = segment.trim();
        if (!trimmed) continue;

        const colonIndex = findUnescapedChar(trimmed, ':');
        if (colonIndex <= 0) continue;

        const name = unescapeIniText(trimmed.slice(0, colonIndex)).trim();
        if (!name) continue;

        params.push(createParamItem(name, unescapeIniText(trimmed.slice(colonIndex + 1)).trim()));
    }

    return params;
}

/** 解析单行：title=msgtype;key:value,key:value */
export function parseIniCaseLine(
    line: string,
    hostTemplate: string,
    index: number,
): TabData | null {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('[')) return null;

    const eqIndex = findUnescapedChar(trimmed, '=');
    if (eqIndex <= 0) return null;

    const title = unescapeIniText(trimmed.slice(0, eqIndex)).trim();
    const remainder = trimmed.slice(eqIndex + 1).trim();
    if (!remainder) return null;

    const semiIndex = findUnescapedChar(remainder, ';');
    if (semiIndex < 0) return null;

    const rawMsgtype = remainder.slice(0, semiIndex).trim();
    const msgtypeQueryIndex = findUnescapedChar(rawMsgtype, '?');
    const msgtype = unescapeIniText(
        msgtypeQueryIndex === -1 ? rawMsgtype : rawMsgtype.slice(0, msgtypeQueryIndex),
    ).trim();
    if (!msgtype) return null;
    const query = new URLSearchParams(
        msgtypeQueryIndex === -1 ? '' : rawMsgtype.slice(msgtypeQueryIndex + 1),
    );
    const queue = query.get('queue')?.trim() || DEFAULT_KCBP_QUEUE;
    const timeout = query.get('timeout')?.trim() || DEFAULT_KCBP_TIMEOUT;

    const paramsStr = remainder.slice(semiIndex + 1).trim();
    const base = createEmptyCase(index + 1);

    return {
        ...base,
        name: title || `接口 ${index + 1}`,
        protocol: 'KCBP',
        address: serializeKcbpAddress({
            host: hostTemplate,
            msgtype,
            queue,
            timeout,
        }),
        params: parseIniParams(paramsStr),
    };
}

export function parseConfigIni(content: string, hostTemplate = ''): TabData[] {
    const host = parseIniConnectionHost(content) || hostTemplate;
    const cases: TabData[] = [];

    content.split(/\r?\n/).forEach((line, lineIndex) => {
        const caseItem = parseIniCaseLine(line, host, cases.length);
        if (caseItem) cases.push(caseItem);
        void lineIndex;
    });

    return cases;
}
