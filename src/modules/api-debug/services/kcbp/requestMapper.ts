import type { TabData } from '../../types/workspace';
import type { KcbpRequestOptions, KcbpResponseData } from '../../../../types/kcbp';
import { parseKcbpAddress, splitHost, type KcbpAddressParts } from '../../utils/kcbp/kcbpAddress';
import {
    extractMissingParamFromKcbpResponse,
    mergeParamIntoList,
} from '../../utils/kcbp/kcbpParams';
import { parseKcbpResponseStatus } from '../../utils/kcbp/kcbpResponse';
import type { KcbpCallOutcome } from './types';

export { buildEnabledParamFields, buildKcbpFields } from '../../utils/kcbp/kcbpFields';

function parseOptionalInt(value: string | undefined): number | undefined {
    const trimmed = value?.trim();
    if (!trimmed || !/^-?\d+$/.test(trimmed)) return undefined;
    return Number.parseInt(trimmed, 10);
}

function resolveClientSessionId(value: string | undefined, fields: Record<string, string>): number | undefined {
    const trimmed = value?.trim();
    const resolved = trimmed?.startsWith('@') ? fields[trimmed.slice(1)] : trimmed;
    return parseOptionalInt(resolved);
}

export function buildKcbpRequest(
    addressParts: KcbpAddressParts,
    msgtype: string,
    fields: Record<string, string>,
    binaryFields: Record<string, string> = {},
    protocol?: string,
): KcbpRequestOptions {
    const { ip, port } = splitHost(addressParts.host);

    if (protocol === 'KGBP') {
        return {
            type: 'KGBP',
            connection: {
                ip: ip || undefined,
                port: port || undefined,
                apiid: msgtype,
                requesttimeout: addressParts.timeout.trim() || undefined,
            },
            param: {
                msgtype,
                fields,
                binaryFields: Object.keys(binaryFields).length > 0 ? binaryFields : undefined,
                servicename: addressParts.service?.trim() || undefined,
                nodeid: parseOptionalInt(addressParts.nodeId),
                clientsessionid: resolveClientSessionId(addressParts.clientSessionId, fields),
            },
        };
    }

    return {
        connection: {
            ip: ip || undefined,
            port: port || undefined,
            apiid: msgtype,
            reqqueue: addressParts.queue.trim() || undefined,
            requesttimeout: addressParts.timeout.trim() || undefined,
            service: 'kcbp',
        },
        param: {
            msgtype,
            fields,
            binaryFields: Object.keys(binaryFields).length > 0 ? binaryFields : undefined,
        },
    };
}

export function buildKcbpCallOutcome(
    tab: Pick<TabData, 'params'>,
    address: string,
    fallbackName: string,
    raw: KcbpResponseData,
): KcbpCallOutcome {
    const msgtype = parseKcbpAddress(address).msgtype.trim() || fallbackName;
    const response: KcbpCallOutcome['response'] = {
        code: raw.code,
        message: raw.msg,
        resultSets: raw.data,
        stats: raw.stats,
        calledAt: Date.now(),
    };

    const missingParam = extractMissingParamFromKcbpResponse(raw.code, raw.msg, raw.data);
    const nextParams = missingParam
        ? mergeParamIntoList(tab.params, missingParam.name, missingParam.value)
        : tab.params;

    return {
        response,
        nextParams,
        status: parseKcbpResponseStatus(response),
        missingParam,
        msgtype,
    };
}
