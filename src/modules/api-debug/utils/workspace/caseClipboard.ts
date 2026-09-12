import type { ParamItem, TabData } from '../../types/workspace';

const CASE_CLIPBOARD_TYPE = 'golden-api/case';
const CASE_CLIPBOARD_VERSION = 1;

export interface ClipboardCase {
    name: string;
    protocol: string;
    address: string;
    params: ParamItem[];
    script?: string;
    runInput?: Record<string, unknown>;
    requestScript?: string;
    responseScript?: string;
    favorite?: boolean;
}

interface CaseClipboardPayload {
    type: typeof CASE_CLIPBOARD_TYPE;
    version: typeof CASE_CLIPBOARD_VERSION;
    case: ClipboardCase;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isParamItem(value: unknown): value is ParamItem {
    if (!isRecord(value)) return false;
    return (
        typeof value.name === 'string' &&
        typeof value.value === 'string' &&
        (value.type === 'string' || value.type === 'file' || value.type === 'disabled')
    );
}

function isOptionalRecord(value: unknown): value is Record<string, unknown> | undefined {
    return value === undefined || isRecord(value);
}

function isClipboardCase(value: unknown): value is ClipboardCase {
    if (!isRecord(value)) return false;
    return (
        typeof value.name === 'string' &&
        typeof value.protocol === 'string' &&
        typeof value.address === 'string' &&
        Array.isArray(value.params) &&
        value.params.every(isParamItem) &&
        (value.script === undefined || typeof value.script === 'string') &&
        isOptionalRecord(value.runInput) &&
        (value.requestScript === undefined || typeof value.requestScript === 'string') &&
        (value.responseScript === undefined || typeof value.responseScript === 'string') &&
        (value.favorite === undefined || typeof value.favorite === 'boolean')
    );
}

export function serializeCaseForClipboard(caseItem: TabData): string {
    const payload: CaseClipboardPayload = {
        type: CASE_CLIPBOARD_TYPE,
        version: CASE_CLIPBOARD_VERSION,
        case: {
            name: caseItem.name,
            protocol: caseItem.protocol,
            address: caseItem.address,
            params: caseItem.params.map((param) => ({ ...param })),
            script: caseItem.script,
            runInput: caseItem.runInput ? { ...caseItem.runInput } : undefined,
            requestScript: caseItem.requestScript,
            responseScript: caseItem.responseScript,
            favorite: caseItem.favorite,
        },
    };
    return JSON.stringify(payload);
}

export function parseCaseFromClipboard(text: string): ClipboardCase | null {
    try {
        const value: unknown = JSON.parse(text);
        if (!isRecord(value)) return null;
        if (value.type !== CASE_CLIPBOARD_TYPE || value.version !== CASE_CLIPBOARD_VERSION) {
            return null;
        }
        return isClipboardCase(value.case) ? value.case : null;
    } catch {
        return null;
    }
}
