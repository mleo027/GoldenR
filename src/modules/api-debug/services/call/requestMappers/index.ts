import type { KcbpRequestOptions } from '../../../../../types/kcbp';
import type { KcbpAddressParts } from '../../../utils/kcbp/kcbpAddress';
import { mapKcbpRequest } from './kcbp';
import { mapKgbpRequest } from './kgbp';
import { mapKuabRequest } from './kuab';

export function buildApiRequest(
    parts: KcbpAddressParts,
    msgtype: string,
    fields: Record<string, string>,
    binaryFields: Record<string, string> = {},
    protocol?: string,
): KcbpRequestOptions {
    if (protocol === 'KGBP') return mapKgbpRequest(parts, msgtype, fields, binaryFields);
    if (protocol === 'KUAB') return mapKuabRequest(parts, msgtype, fields, binaryFields);
    return mapKcbpRequest(parts, msgtype, fields, binaryFields);
}
