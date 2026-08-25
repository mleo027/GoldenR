import { describe, expect, it } from 'vitest';
import {
    KGBP_REQUIRED_FIELDS_MESSAGE,
    applyKcxpEnvironmentToAddress,
    buildAddressFromKcxpEnvironment,
    createKcxpEnvironment,
    findMissingKgbpRequiredFields,
    isKgbpAddressReady,
    normalizeKcxpEnvironments,
    resolveActiveKcxpEnvironmentId,
    resolveKcxpProtocol,
} from './kcxpEnvironment';
import type { KcxpEnvironment } from '../../types/kcxp';

const testEnv: KcxpEnvironment = {
    id: 'test',
    name: '测试',
    host: '10.0.0.1:21000',
    queue: 'req2',
    timeout: '30',
};

describe('applyKcxpEnvironmentToAddress', () => {
    it('replaces host, queue and timeout while keeping msgtype', () => {
        expect(
            applyKcxpEnvironmentToAddress('127.0.0.1:21000/150501?queue=req1&timeout=15', testEnv),
        ).toBe('10.0.0.1:21000/150501?queue=req2&timeout=30');
    });

    it('applies environment to empty address', () => {
        expect(applyKcxpEnvironmentToAddress('', testEnv)).toBe(
            '10.0.0.1:21000?queue=req2&timeout=30',
        );
    });
});

describe('applyKcxpEnvironmentToAddress (KGBP)', () => {
    const kgbpEnv: KcxpEnvironment = {
        id: 'kgbp',
        name: 'KGBP-DEV',
        protocol: 'KGBP',
        host: '10.0.0.2:9100',
        queue: '',
        timeout: '20',
        service: 'srv-demo',
        nodeId: '3',
        sessionId: '88',
        connectTimeout: '5',
    };

    it('writes kgbp query params and drops queue while keeping msgtype', () => {
        expect(
            applyKcxpEnvironmentToAddress('127.0.0.1:21000/150501?queue=req1&timeout=15', kgbpEnv),
        ).toBe(
            '10.0.0.2:9100/150501?service=srv-demo&nodeid=3&sessionid=88&connecttimeout=5&requesttimeout=20',
        );
    });

    it('omits empty optional params and keeps address parseable roundtrip', () => {
        const minimal: KcxpEnvironment = {
            ...kgbpEnv,
            sessionId: undefined,
            connectTimeout: undefined,
        };
        const address = applyKcxpEnvironmentToAddress('/150501?queue=req1&sessionid=7', minimal);
        expect(address).toBe('10.0.0.2:9100/150501?service=srv-demo&nodeid=3&requesttimeout=20');
    });
});

describe('applyKcxpEnvironmentToAddress (KGBP → KCBP 切换)', () => {
    it('strips kgbp-only keys when switching back to a KCBP environment', () => {
        const kcbpEnv: KcxpEnvironment = {
            id: 'kcbp-dev',
            name: 'KCBP-DEV',
            protocol: 'KCBP',
            host: '10.0.0.1:21000',
            queue: 'req2',
            timeout: '30',
        };
        expect(
            applyKcxpEnvironmentToAddress(
                '10.0.0.2:9100/150501?service=srv-demo&nodeid=3&sessionid=88&connecttimeout=5&requesttimeout=20',
                kcbpEnv,
            ),
        ).toBe('10.0.0.1:21000/150501?queue=req2&timeout=30');
    });
});

describe('findMissingKgbpRequiredFields / isKgbpAddressReady', () => {
    it('reports both fields missing when absent', () => {
        expect(findMissingKgbpRequiredFields({ service: undefined, nodeId: undefined })).toEqual([
            'ServiceName',
            'NodeId',
        ]);
        expect(isKgbpAddressReady({ service: '', nodeId: '' })).toBe(false);
    });

    it('rejects non-integer nodeId but accepts pure integers', () => {
        expect(findMissingKgbpRequiredFields({ service: 'srv', nodeId: '12.5' })).toEqual(['NodeId']);
        expect(findMissingKgbpRequiredFields({ service: 'srv', nodeId: 'abc' })).toEqual(['NodeId']);
        expect(isKgbpAddressReady({ service: 'srv', nodeId: '-3' })).toBe(true);
        expect(isKgbpAddressReady({ service: 'srv', nodeId: ' 3 ' })).toBe(true);
    });

    it('passes when both required fields are valid', () => {
        expect(findMissingKgbpRequiredFields({ service: 'srv-demo', nodeId: '3' })).toEqual([]);
        expect(isKgbpAddressReady({ service: 'srv-demo', nodeId: '3' })).toBe(true);
    });

    it('exposes the user-facing blocking message', () => {
        expect(KGBP_REQUIRED_FIELDS_MESSAGE).toContain('ServiceName/NodeId');
    });
});

describe('resolveKcxpProtocol / createKcxpEnvironment', () => {
    it('defaults missing protocol to KCBP', () => {
        expect(resolveKcxpProtocol(testEnv)).toBe('KCBP');
        expect(resolveKcxpProtocol({ ...testEnv, protocol: 'KGBP' })).toBe('KGBP');
    });

    it('creates environment with default protocol KCBP and optional kgbp fields', () => {
        expect(createKcxpEnvironment('A').protocol).toBe('KCBP');
        const env = createKcxpEnvironment('B', { protocol: 'KGBP', service: 's', nodeId: '1' });
        expect(env.protocol).toBe('KGBP');
        expect(env.service).toBe('s');
        expect(env.nodeId).toBe('1');
    });
});

describe('buildAddressFromKcxpEnvironment', () => {
    it('builds address with optional msgtype', () => {
        expect(buildAddressFromKcxpEnvironment(testEnv, '150501')).toBe(
            '10.0.0.1:21000/150501?queue=req2&timeout=30',
        );
    });
});

describe('normalizeKcxpEnvironments', () => {
    it('falls back to defaults for invalid input', () => {
        const envs = normalizeKcxpEnvironments(null);
        expect(envs.length).toBeGreaterThan(0);
        expect(envs[0].name).toBe('DEV');
    });
});

describe('resolveActiveKcxpEnvironmentId', () => {
    it('falls back when active id is missing', () => {
        expect(resolveActiveKcxpEnvironmentId([testEnv], 'missing')).toBe('test');
    });
});
