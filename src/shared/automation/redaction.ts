const MASK = '••••••';
const SENSITIVE_KEY = /(?:password|passwd|pwd|secret|token|credential)/i;

function sensitiveValueSet(values: unknown[]): Set<string> {
    return new Set(
        values
            .filter((value) => value !== null && value !== undefined && value !== '')
            .map((value) => String(value)),
    );
}

export function redactAutomationValue(value: unknown, sensitiveValues: unknown[] = []): unknown {
    const matches = sensitiveValueSet(sensitiveValues);
    const visit = (current: unknown, key?: string): unknown => {
        if (key && SENSITIVE_KEY.test(key)) return MASK;
        if (
            (typeof current === 'string' ||
                typeof current === 'number' ||
                typeof current === 'boolean') &&
            matches.has(String(current))
        ) {
            return MASK;
        }
        if (Array.isArray(current)) return current.map((item) => visit(item));
        if (current && typeof current === 'object') {
            return Object.fromEntries(
                Object.entries(current).map(([name, item]) => [name, visit(item, name)]),
            );
        }
        return current;
    };
    return visit(value);
}
