import type { KcbpAddressParts } from '../../../utils/kcbp/kcbpAddress';
import { parseKcxpInteger, resolveKcxpClientSessionId, splitKcxpHost } from '@/shared/kcxp/request';

export function connectionHost(parts: KcbpAddressParts) {
    const { ip, port } = splitKcxpHost(parts.host);
    return { ip: ip || undefined, port: port || undefined };
}

export function binaryFieldsOrUndefined(
    binaryFields: Record<string, string>,
): Record<string, string> | undefined {
    return Object.keys(binaryFields).length > 0 ? binaryFields : undefined;
}

export function parseOptionalInteger(value: string | undefined): number | undefined {
    return parseKcxpInteger(value);
}

export function resolveClientSessionId(
    value: string | undefined,
    fields: Record<string, string>,
): number | undefined {
    return resolveKcxpClientSessionId(value, fields);
}
