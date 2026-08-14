import type { TcdRunInput } from './types';

export const EMPTY_RUN_INPUT: TcdRunInput = {};

export function parseRunInputJson(
    text: string,
): { ok: true; value: TcdRunInput } | { ok: false; error: string } {
    const trimmed = text.trim();
    if (!trimmed) {
        return { ok: true, value: {} };
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(trimmed);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { ok: false, error: `运行参数 JSON 无效：${message}` };
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { ok: false, error: '运行参数必须是 JSON 对象，例如 {"fundid":"8"}' };
    }

    return { ok: true, value: parsed as TcdRunInput };
}

export function stringifyRunInput(value: TcdRunInput | undefined): string {
    if (!value || Object.keys(value).length === 0) {
        return '{\n  \n}';
    }
    return JSON.stringify(value, null, 2);
}

export function normalizeRunInput(value: unknown): TcdRunInput {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return {};
    }
    return value as TcdRunInput;
}
