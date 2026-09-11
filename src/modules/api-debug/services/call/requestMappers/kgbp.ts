import type { KcbpRequestOptions } from '../../../../../types/kcbp';
import type { KcbpAddressParts } from '../../../utils/kcbp/kcbpAddress';
import {
    binaryFieldsOrUndefined,
    connectionHost,
    parseOptionalInteger,
    resolveClientSessionId,
} from './common';

export function mapKgbpRequest(
    parts: KcbpAddressParts,
    msgtype: string,
    fields: Record<string, string>,
    binaryFields: Record<string, string>,
): KcbpRequestOptions {
    return {
        type: 'KGBP',
        connection: {
            ...connectionHost(parts),
            apiid: msgtype,
            requesttimeout: parts.timeout.trim() || undefined,
        },
        param: {
            msgtype,
            fields,
            binaryFields: binaryFieldsOrUndefined(binaryFields),
            servicename: parts.service?.trim() || undefined,
            nodeid: parseOptionalInteger(parts.nodeId),
            clientsessionid: resolveClientSessionId(parts.clientSessionId, fields),
        },
    };
}
