import type { AutomationApiCallRequest, AutomationInputValue } from './types';
import type { KcbpRequestOptions } from '../kcbp/types';
import type { KcxpEnvironment } from '../kcxp/types';
import { parseKcxpInteger, resolveKcxpClientSessionId, splitKcxpHost } from '../kcxp/request';

function toFields(values: Record<string, AutomationInputValue | { file: string }>) {
    const fields: Record<string, string> = {};
    const binaryFields: Record<string, string> = {};
    for (const [name, value] of Object.entries(values)) {
        if (value && typeof value === 'object' && 'file' in value) binaryFields[name] = value.file;
        else fields[name] = value == null ? '' : String(value);
    }
    return { fields, binaryFields };
}

export function buildAutomationApiRequest(
    environment: KcxpEnvironment,
    request: AutomationApiCallRequest,
): KcbpRequestOptions {
    const { fields, binaryFields } = toFields(request.fields);
    const connection = {
        ...splitKcxpHost(environment.host),
        requesttimeout: environment.timeout || undefined,
    };
    const binaries = Object.keys(binaryFields).length > 0 ? binaryFields : undefined;
    if (environment.protocol === 'KGBP') {
        return {
            type: 'KGBP',
            connection: { ...connection, apiid: request.msgtype },
            param: {
                msgtype: request.msgtype,
                fields,
                binaryFields: binaries,
                servicename: environment.service || undefined,
                nodeid: parseKcxpInteger(environment.nodeId),
                clientsessionid: resolveKcxpClientSessionId(environment.clientSessionId, fields),
            },
        };
    }
    if (environment.protocol === 'KUAB') {
        return {
            type: 'KUAB',
            connection: { ...connection, reqqueue: environment.queue || undefined },
            param: { msgtype: request.msgtype, fields, binaryFields: binaries },
        };
    }
    return {
        type: 'KCBP',
        connection: {
            ...connection,
            apiid: request.msgtype,
            reqqueue: environment.queue || undefined,
            service: 'kcbp',
        },
        param: { msgtype: request.msgtype, fields, binaryFields: binaries },
    };
}
