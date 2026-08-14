export interface KcbpAddressParts {
    host: string;
    msgtype: string;
    queue: string;
    timeout: string;
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

    return {
        host: hostPart.trim(),
        msgtype: msgtypePart.trim(),
        queue: queue?.trim() ? queue.trim() : DEFAULT_KCBP_QUEUE,
        timeout: timeout?.trim() ?? '',
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

    if (!host && !msgtype && !queue && !timeout) {
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
