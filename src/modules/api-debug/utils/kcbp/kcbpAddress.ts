export interface KcbpAddressParts {
    host: string;
    msgtype: string;
    queue: string;
    timeout: string;
    /** KGBP：网关服务名 */
    service?: string;
    /** KGBP：节点 ID */
    nodeId?: string;
    /** KGBP：会话 ID */
    sessionId?: string;
    /** KGBP：连接超时（秒） */
    connectTimeout?: string;
}

export const DEFAULT_KCBP_QUEUE = 'req1';
export const DEFAULT_KCBP_TIMEOUT = '15';

export function parseKcbpAddress(address: string): KcbpAddressParts {
    const trimmed = address.trim();
    if (!trimmed) {
        return {
            host: '',
            msgtype: '',
            queue: DEFAULT_KCBP_QUEUE,
            timeout: '',
            service: undefined,
            nodeId: undefined,
            sessionId: undefined,
            connectTimeout: undefined,
        };
    }

    let hostPart = '';
    let msgtypePart = '';
    let queryPart = '';

    const slashIndex = trimmed.indexOf('/');
    if (slashIndex === -1) {
        const queryIndex = trimmed.indexOf('?');
        if (queryIndex === -1) {
            hostPart = trimmed;
        } else {
            hostPart = trimmed.slice(0, queryIndex);
            queryPart = trimmed.slice(queryIndex + 1);
        }
    } else {
        hostPart = trimmed.slice(0, slashIndex);
        const rest = trimmed.slice(slashIndex + 1);
        const queryIndex = rest.indexOf('?');
        if (queryIndex === -1) {
            msgtypePart = rest;
        } else {
            msgtypePart = rest.slice(0, queryIndex);
            queryPart = rest.slice(queryIndex + 1);
        }
    }

    const params = new URLSearchParams(queryPart);
    const queue = params.get('queue') ?? params.get('reqqueue');
    const timeout = params.get('timeout') ?? params.get('requesttimeout');
    const service = params.get('service');
    const nodeId = params.get('nodeid');
    const sessionId = params.get('sessionid');
    const connectTimeout = params.get('connecttimeout');

    return {
        host: hostPart.trim(),
        msgtype: msgtypePart.trim(),
        queue: queue?.trim() ? queue.trim() : DEFAULT_KCBP_QUEUE,
        timeout: timeout?.trim() ?? '',
        service: service?.trim() || undefined,
        nodeId: nodeId?.trim() || undefined,
        sessionId: sessionId?.trim() || undefined,
        connectTimeout: connectTimeout?.trim() || undefined,
    };
}

export function normalizeKcbpAddress(address: string): string {
    return serializeKcbpAddress(parseKcbpAddress(address));
}

export function serializeKcbpAddress(parts: KcbpAddressParts): string {
    const host = parts.host.trim();
    const msgtype = parts.msgtype.trim();
    const queue = parts.queue.trim();
    const timeout = parts.timeout.trim();
    const service = parts.service?.trim() ?? '';
    const nodeId = parts.nodeId?.trim() ?? '';
    const sessionId = parts.sessionId?.trim() ?? '';
    const connectTimeout = parts.connectTimeout?.trim() ?? '';

    if (
        !host &&
        !msgtype &&
        !queue &&
        !timeout &&
        !service &&
        !nodeId &&
        !sessionId &&
        !connectTimeout
    ) {
        return '';
    }

    let result = host;
    if (msgtype) {
        result += `/${msgtype}`;
    }

    const params = new URLSearchParams();
    if (queue) {
        params.set('queue', queue);
    }
    if (timeout) {
        params.set('timeout', timeout);
    }
    if (service) {
        params.set('service', service);
    }
    if (nodeId) {
        params.set('nodeid', nodeId);
    }
    if (sessionId) {
        params.set('sessionid', sessionId);
    }
    if (connectTimeout) {
        params.set('connecttimeout', connectTimeout);
    }

    const query = params.toString();
    if (query) {
        result += `?${query}`;
    }

    return result;
}

export function splitHost(host: string): { ip: string; port: string } {
    const [ip = '', port = ''] = host.trim().split(':');
    return {
        ip: ip.trim(),
        port: port.trim(),
    };
}
