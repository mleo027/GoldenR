export function splitKcxpHost(host: string): { ip?: string; port?: string } {
    const trimmed = host.trim();
    const index = trimmed.lastIndexOf(':');
    if (index <= 0) return { ip: trimmed || undefined };
    return {
        ip: trimmed.slice(0, index) || undefined,
        port: trimmed.slice(index + 1) || undefined,
    };
}

export function parseKcxpInteger(value: string | undefined): number | undefined {
    const trimmed = value?.trim();
    return trimmed && /^-?\d+$/.test(trimmed) ? Number.parseInt(trimmed, 10) : undefined;
}

export function resolveKcxpClientSessionId(
    value: string | undefined,
    fields: Record<string, string>,
): number | undefined {
    const trimmed = value?.trim();
    return parseKcxpInteger(trimmed?.startsWith('@') ? fields[trimmed.slice(1)] : trimmed);
}
