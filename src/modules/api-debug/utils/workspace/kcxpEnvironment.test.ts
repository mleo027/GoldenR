import { describe, expect, it } from 'vitest';
import {
    applyKcxpEnvironmentToAddress,
    buildAddressFromKcxpEnvironment,
    createKcxpEnvironment,
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
