import type { ParamItem } from '../../types/workspace';

export const FILE_PARAM_PREFIX = '@file:';

export interface KcbpFieldsPayload {
    fields: Record<string, string>;
    binaryFields: Record<string, string>;
}

export function isFileParamValue(value: string): boolean {
    return value.trimStart().startsWith(FILE_PARAM_PREFIX);
}

export function isFilePickerTriggerValue(value: string): boolean {
    const trimmed = value.trim();
    return trimmed === '@file' || trimmed === '@file:';
}

export function parseFileParamPath(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed.startsWith(FILE_PARAM_PREFIX)) return null;
    const filePath = trimmed.slice(FILE_PARAM_PREFIX.length).trim();
    return filePath || null;
}

export function formatFileParamValue(filePath: string): string {
    return `${FILE_PARAM_PREFIX}${filePath}`;
}

/** @deprecated 兼容旧版 type=file；新入参请使用 @file: 前缀 */
export function resolveBinaryFieldPath(param: ParamItem): string | null {
    if (param.type === 'file') {
        const legacy = param.value.trim();
        return legacy || null;
    }
    return parseFileParamPath(param.value);
}

export function buildKcbpFields(params: ParamItem[]): KcbpFieldsPayload {
    const fields: Record<string, string> = {};
    const binaryFields: Record<string, string> = {};

    for (const param of params) {
        if (param.type === 'disabled' || !param.name.trim()) continue;

        const name = param.name.trim();
        const filePath = resolveBinaryFieldPath(param);
        if (filePath) {
            binaryFields[name] = filePath;
            continue;
        }

        fields[name] = param.value;
    }

    return { fields, binaryFields };
}

export function buildEnabledParamFields(params: ParamItem[]): Record<string, string> {
    return buildKcbpFields(params).fields;
}

export function isFileCallFieldValue(value: unknown): value is { file: string } {
    return (
        value !== null &&
        typeof value === 'object' &&
        typeof (value as { file?: unknown }).file === 'string'
    );
}

export function formatParamScriptFieldValue(item: ParamItem): string {
    if (item.type === 'file') {
        return JSON.stringify(formatFileParamValue(item.value));
    }
    return JSON.stringify(item.value);
}
