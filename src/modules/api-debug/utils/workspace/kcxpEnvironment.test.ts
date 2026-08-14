import { describe, expect, it } from 'vitest';
import {
    applyKcxpEnvironmentToAddress,
    buildAddressFromKcxpEnvironment,
    normalizeKcxpEnvironments,
    resolveActiveKcxpEnvironmentId,
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
