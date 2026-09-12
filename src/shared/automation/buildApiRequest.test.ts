import { describe, expect, it } from 'vitest';
import { buildAutomationApiRequest } from './buildApiRequest';

describe('buildAutomationApiRequest', () => {
    it('maps KGBP configuration and resolves a field-backed client session id', () => {
        const request = buildAutomationApiRequest(
            {
                id: 'env',
                name: 'KGBP',
                protocol: 'KGBP',
                host: '127.0.0.1:21000',
                queue: '',
                timeout: '15',
                service: 'gateway',
                nodeId: '3',
                clientSessionId: '@custid',
            },
            { environmentId: 'env', msgtype: '150501', fields: { custid: '6001' } },
        );
        expect(request).toMatchObject({
            type: 'KGBP',
            connection: { ip: '127.0.0.1', port: '21000', apiid: '150501' },
            param: { servicename: 'gateway', nodeid: 3, clientsessionid: 6001 },
        });
    });
});
