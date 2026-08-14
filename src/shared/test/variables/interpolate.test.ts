import { describe, expect, it } from 'vitest';
import { extractVariableNames, interpolateTemplate } from './interpolate';
import { buildMergedVariables, mergeVariableScopes } from './resolveScope';

describe('interpolateTemplate', () => {
    it('replaces ${name} with variable value', () => {
        expect(interpolateTemplate('fundid=${fundid}', { fundid: '8' })).toBe('fundid=8');
    });

    it('throws when variable missing', () => {
        expect(() => interpolateTemplate('${missing}', {})).toThrow('变量未定义');
    });
});

describe('mergeVariableScopes', () => {
    it('later layers override earlier', () => {
        const merged = mergeVariableScopes([{ fundid: '1', market: '0' }, { fundid: '8' }]);
        expect(merged).toEqual({ fundid: '8', market: '0' });
    });
});

describe('buildMergedVariables', () => {
    it('merges four levels', () => {
        const merged = buildMergedVariables({
            globalVariables: { timeout: '30' },
            environmentVariables: { fundid: '8' },
            suiteVariables: { productCode: 'KSPB' },
            caseVariables: { market: '1' },
        });
        expect(merged).toEqual({
            timeout: '30',
            fundid: '8',
            productCode: 'KSPB',
            market: '1',
        });
    });

    it('extractVariableNames finds refs', () => {
        expect(extractVariableNames('${fundid}-${market}')).toEqual(['fundid', 'market']);
    });
});
