import type { KcbpAddressParts } from '../../../utils/kcbp/kcbpAddress';
import { splitHost } from '../../../utils/kcbp/kcbpAddress';

export function connectionHost(parts: KcbpAddressParts) {
    const { ip, port } = splitHost(parts.host);
    return { ip: ip || undefined, port: port || undefined };
}

export function binaryFieldsOrUndefined(
    binaryFields: Record<string, string>,
): Record<string, string> | undefined {
    return Object.keys(binaryFields).length > 0 ? binaryFields : undefined;
}

export function parseOptionalInteger(value: string | undefined): number | undefined {
    const trimmed = value?.trim();
    return trimmed && /^-?\d+$/.test(trimmed) ? Number.parseInt(trimmed, 10) : undefined;
}

export function resolveClientSessionId(
    value: string | undefined,
    fields: Record<string, string>,
): number | undefined {
    const trimmed = value?.trim();
    return parseOptionalInteger(trimmed?.startsWith('@') ? fields[trimmed.slice(1)] : trimmed);
}
