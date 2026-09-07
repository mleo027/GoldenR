import type { KcbpResultSet } from '../../../src/shared/kcbp/types';

export interface KcbpResponseData {
    code: string;
    msg: string;
    data: unknown[];
    level?: string;
    stats: { timecost: number; rows: number };
}

interface RawKcbpResponseData {
    code: string | number;
    msg: string;
    data: unknown[];
    level?: string;
}

function isResultSetLike(item: unknown): boolean {
    return Boolean(
        item &&
        typeof item === 'object' &&
        !Array.isArray(item) &&
        Array.isArray((item as { rows?: unknown }).rows),
    );
}

function toResultSet(item: unknown): KcbpResultSet {
    const source = (item ?? {}) as Record<string, unknown>;
    return {
        name: typeof source.name === 'string' ? source.name : '',
        rows: source.rows as Record<string, unknown>[],
    };
}

export function normalizeResultSets(data: unknown[]): KcbpResultSet[] {
    if (data.length === 0) return [];
    if (data.every(isResultSetLike)) return data.map(toResultSet);
    return [{ name: '', rows: data as Record<string, unknown>[] }];
}

function isValidResult(value: unknown): value is RawKcbpResponseData {
    if (!value || typeof value !== 'object') return false;
    const data = value as Record<string, unknown>;
    return (
        'code' in data &&
        (typeof data.code === 'string' || typeof data.code === 'number') &&
        'msg' in data &&
        typeof data.msg === 'string' &&
        'data' in data &&
        Array.isArray(data.data)
    );
}

function parseValidResult(raw: unknown): RawKcbpResponseData | null {
    if (isValidResult(raw)) return raw;
    if (typeof raw !== 'string') return null;
    try {
        const parsed = JSON.parse(raw) as unknown;
        return isValidResult(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

function countResponseRows(data: unknown[]): number {
    return data.reduce<number>((count, item) => {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
            const rows = (item as { rows?: unknown }).rows;
            if (Array.isArray(rows)) return count + rows.length;
        }
        return count + 1;
    }, 0);
}

function toNormalizedResult(raw: RawKcbpResponseData, timecost: number): KcbpResponseData {
    return {
        ...raw,
        code: String(raw.code),
        data: normalizeResultSets(raw.data),
        stats: { timecost, rows: countResponseRows(raw.data) },
    };
}

function toEnvelopeResult(raw: unknown, timecost: number): KcbpResponseData {
    const envelope =
        raw && typeof raw === 'object' && !Array.isArray(raw)
            ? (raw as Record<string, unknown>)
            : null;
    const code =
        envelope && (typeof envelope.code === 'string' || typeof envelope.code === 'number')
            ? String(envelope.code)
            : '0';
    const msg = envelope && typeof envelope.msg === 'string' ? envelope.msg : 'Success';
    const level = envelope && typeof envelope.level === 'string' ? envelope.level : undefined;
    return {
        code,
        msg,
        ...(level ? { level } : {}),
        data: [],
        stats: { timecost, rows: 0 },
    };
}

export function parseKcbpResult(raw: unknown, startedAt: number): KcbpResponseData {
    const elapsed = Date.now() - startedAt;
    const valid = parseValidResult(raw);
    return valid ? toNormalizedResult(valid, elapsed) : toEnvelopeResult(raw, elapsed);
}
