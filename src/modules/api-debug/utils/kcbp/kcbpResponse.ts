import type { ParamItem, ResponseData } from '../../types/workspace';
import { mergeParamIntoList } from './kcbpParams';

export type ResponseStatusKind = 'success' | 'warning' | 'error';

export interface ParsedKcbpResponseStatus {
    kind: ResponseStatusKind;
    businessCode: string | number;
    businessMsg: string;
    businessLevel?: string | number;
    transportCode: string | number;
    transportMsg: string;
    hasBusinessRow: boolean;
}

export function parseKcbpResponseStatus(response: ResponseData): ParsedKcbpResponseStatus {
    const transportCode = response.code;
    const transportMsg = response.message;
    const rawLevel = response.level;
    const businessLevel =
        typeof rawLevel === 'string' || typeof rawLevel === 'number' ? rawLevel : undefined;
    const codeStr = String(transportCode);
    const levelNum = Number(businessLevel);

    if (String(transportCode) === '-1') {
        return {
            kind: 'error',
            businessCode: transportCode,
            businessMsg: transportMsg,
            transportCode,
            transportMsg,
            hasBusinessRow: false,
        };
    }

    let kind: ResponseStatusKind = 'success';
    if (codeStr === '90001' || codeStr.includes('90001')) {
        kind = 'warning';
    } else if (levelNum >= 2 || (codeStr.startsWith('-') && codeStr !== '-1')) {
        kind = 'error';
    } else if (levelNum === 1) {
        kind = 'warning';
    }

    return {
        kind,
        businessCode: transportCode,
        businessMsg: transportMsg,
        businessLevel,
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
