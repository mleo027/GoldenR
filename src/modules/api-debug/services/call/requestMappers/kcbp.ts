import type { KcbpRequestOptions } from '../../../../../types/kcbp';
import type { KcbpAddressParts } from '../../../utils/kcbp/kcbpAddress';
import { binaryFieldsOrUndefined, connectionHost } from './common';

export function mapKcbpRequest(
    parts: KcbpAddressParts,
    msgtype: string,
    fields: Record<string, string>,
    binaryFields: Record<string, string>,
): KcbpRequestOptions {
    return {
        connection: {
            ...connectionHost(parts),
            apiid: msgtype,
            reqqueue: parts.queue.trim() || undefined,
            requesttimeout: parts.timeout.trim() || undefined,
            service: 'kcbp',
        },
        param: { msgtype, fields, binaryFields: binaryFieldsOrUndefined(binaryFields) },
    };
}
