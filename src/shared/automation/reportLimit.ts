const MAX_ROWS = 100;
const MAX_TEXT_LENGTH = 20_000;

export function limitAutomationReportValue(value: unknown): {
    value: unknown;
    truncated: boolean;
} {
    let truncated = false;
    const visit = (current: unknown): unknown => {
        if (typeof current === 'string' && current.length > MAX_TEXT_LENGTH) {
            truncated = true;
            return `${current.slice(0, MAX_TEXT_LENGTH)}…`;
        }
        if (Array.isArray(current)) {
            if (current.length > MAX_ROWS) truncated = true;
            return current.slice(0, MAX_ROWS).map(visit);
        }
        if (current && typeof current === 'object') {
            return Object.fromEntries(
                Object.entries(current).map(([key, item]) => [key, visit(item)]),
            );
        }
        return current;
    };
    return { value: visit(value), truncated };
}
