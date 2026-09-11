import type { KcbpRequestOptions } from '../../../../../types/kcbp';
import type { KcbpAddressParts } from '../../../utils/kcbp/kcbpAddress';
import { binaryFieldsOrUndefined, connectionHost } from './common';

export function mapKuabRequest(
    parts: KcbpAddressParts,
    msgtype: string,
    fields: Record<string, string>,
    binaryFields: Record<string, string>,
): KcbpRequestOptions {
    return {
        type: 'KUAB',
        connection: {
            ...connectionHost(parts),
            reqqueue: parts.queue.trim() || undefined,
            requesttimeout: parts.timeout.trim() || undefined,
        },
        param: { msgtype, fields, binaryFields: binaryFieldsOrUndefined(binaryFields) },
    };
}
