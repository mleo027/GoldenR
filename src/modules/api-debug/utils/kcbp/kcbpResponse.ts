import type { ParamItem, ResponseData } from '../../types/workspace';
import { mergeParamIntoList } from './kcbpParams';

export type ResponseStatusKind = 'success' | 'warning' | 'error';

export interface ParsedKcbpResponseStatus {
    kind: ResponseStatusKind;
    businessCode: string | number;
    businessMsg: string;
    transportCode: string | number;
    transportMsg: string;
    hasBusinessRow: boolean;
}

export function parseKcbpResponseStatus(response: ResponseData): ParsedKcbpResponseStatus {
    const transportCode = response.code;
    const transportMsg = response.message;

    return {
        kind: String(transportCode) === '0' ? 'success' : 'error',
        businessCode: transportCode,
        businessMsg: transportMsg,
        transportCode,
        transportMsg,
        hasBusinessRow: false,
    };
}

export function extractFieldsFromMsg(msg: string): Record<string, string> {
    const fields: Record<string, string> = {};
    const bracketMatch = msg.match(/\[([^\]]+)\]/);

    if (!bracketMatch) return fields;

    for (const segment of bracketMatch[1].split(',')) {
        const match = segment.trim().match(/^([a-zA-Z_]\w*)\s*=\s*(.*)$/);
        if (match) {
            fields[match[1]] = match[2].trim();
        }
    }

    return fields;
}

function resolveParamName(key: string, params: ParamItem[]): string {
    const lower = key.toLowerCase();
    const exact = params.find((p) => p.name.trim().toLowerCase() === lower);
    if (exact) return exact.name.trim();

    const withG = params.find((p) => p.name.trim().toLowerCase() === `g_${lower}`);
    if (withG) return withG.name.trim();

    return lower.startsWith('g_') ? lower : `g_${lower}`;
}

export function mergeExtractedFieldsIntoParams(
    params: ParamItem[],
    extracted: Record<string, string>,
): ParamItem[] {
    let next = params;

    for (const [key, value] of Object.entries(extracted)) {
        if (!value) continue;
        const name = resolveParamName(key, params);
        next = mergeParamIntoList(next, name, value);
    }

    return next;
}

export const statusTagColor: Record<ResponseStatusKind, string> = {
    success: 'green',
    warning: 'gold',
    error: 'red',
};
