import type { ParamItem } from '../../types/workspace';

const MISSING_PARAM_CODE = '90001';

function tryExtractMissingParam(
    code: string | number,
    msg: string,
): { name: string; value: string } | null {
    const codeStr = String(code);
    const isMissingParamError = codeStr === MISSING_PARAM_CODE || msg.includes(MISSING_PARAM_CODE);

    if (!isMissingParamError) return null;

    const fieldMatch = msg.match(/没有([a-zA-Z_]\w*)项的数据/);
    if (fieldMatch) {
        const name = fieldMatch[1];
        const valueMatch = msg.match(new RegExp(`${name}\\s*[=:：]\\s*(\\S+)`));
        return { name, value: valueMatch?.[1] ?? '' };
    }

    const paramMatch = msg.match(/入参\s*([a-zA-Z_]\w*)/);
    if (paramMatch) {
        const name = paramMatch[1];
        const valueMatch = msg.match(new RegExp(`${name}\\s*[=:：]\\s*(\\S+)`));
        return { name, value: valueMatch?.[1] ?? '' };
    }

    return null;
}

export function extractMissingParamFromKcbpResponse(
    code: string | number,
    msg: string,
    data: unknown[] = [],
): { name: string; value: string } | null {
    const fromTop = tryExtractMissingParam(code, msg);
    if (fromTop) return fromTop;

    for (const item of data) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) continue;

        const row = item as Record<string, unknown>;
        const rowMsg = row.msg;
        if (rowMsg == null) continue;

        const rowCode = row.code ?? '';
        const extracted = tryExtractMissingParam(String(rowCode), String(rowMsg));
        if (extracted) return extracted;
    }

    return null;
}

export function mergeParamIntoList(params: ParamItem[], name: string, value = ''): ParamItem[] {
    const trimmedName = name.trim();
    if (!trimmedName) return params;

    const existingIndex = params.findIndex(
        (p) => p.name.trim().toLowerCase() === trimmedName.toLowerCase(),
    );

    if (existingIndex >= 0) {
        const existing = params[existingIndex];
        const nextValue = value || existing.value;
        const nextType = existing.type === 'disabled' ? 'string' : existing.type;

        if (nextValue === existing.value && nextType === existing.type) {
            return params;
        }

        return params.map((p, i) =>
            i === existingIndex ? { ...p, value: nextValue, type: nextType } : p,
        );
    }

    return [...params, { name: trimmedName, value, type: 'string' }];
}
