export function deepGet(obj: unknown, path: string): unknown {
    const parts = path.split('.').filter(Boolean);
    let current: unknown = obj;
    for (const part of parts) {
        if (current == null || typeof current !== 'object') return undefined;
        current = (current as Record<string, unknown>)[part];
    }
    return current;
}

export function pick<T extends Record<string, unknown>>(obj: T, keys: string[]): Partial<T> {
    const result: Partial<T> = {};
    for (const key of keys) {
        if (key in obj) {
            result[key as keyof T] = obj[key as keyof T];
        }
    }
    return result;
}

export function formatAmount(value: number | string, decimals = 2): string {
    const num = typeof value === 'string' ? Number(value) : value;
    if (Number.isNaN(num)) return String(value);
    return num.toFixed(decimals);
}

export function amountEqual(left: number | string, right: number | string, precision = 2): boolean {
    const a = typeof left === 'string' ? Number(left) : left;
    const b = typeof right === 'string' ? Number(right) : right;
    if (Number.isNaN(a) || Number.isNaN(b)) return false;
    const factor = 10 ** precision;
    return Math.round(a * factor) === Math.round(b * factor);
}

export function amountDelta(
    before: number | string,
    after: number | string,
    expectedDelta: number | string,
    precision = 2,
): boolean {
    const b = typeof before === 'string' ? Number(before) : before;
    const a = typeof after === 'string' ? Number(after) : after;
    const d = typeof expectedDelta === 'string' ? Number(expectedDelta) : expectedDelta;
    if ([b, a, d].some(Number.isNaN)) return false;
    return amountEqual(a - b, d, precision);
}

export function isValidStkCode(code: string): boolean {
    const trimmed = code.trim();
    return /^\d{6}$/.test(trimmed);
}

export function parseMarket(stkcode: string): string {
    const code = stkcode.trim();
    if (!/^\d{6}$/.test(code)) return '';
    if (code.startsWith('6')) return '1';
    if (code.startsWith('0') || code.startsWith('3')) return '0';
    return '';
}

/** Phase 2 可接交易日历；当前为占位实现 */
export function nextTradeDay(dateStr: string): string {
    return dateStr;
}

export const builtinLib = {
    deepGet,
    pick,
    formatAmount,
    amountEqual,
    amountDelta,
    isValidStkCode,
    parseMarket,
    nextTradeDay,
};

export type BuiltinLib = typeof builtinLib;
