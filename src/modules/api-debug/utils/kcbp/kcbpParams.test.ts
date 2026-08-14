import { describe, expect, it } from 'vitest';
import type { ParamItem } from '../../types/workspace';
import { extractMissingParamFromKcbpResponse, mergeParamIntoList } from './kcbpParams';

describe('extractMissingParamFromKcbpResponse', () => {
    it('extracts field name from top-level 90001 message', () => {
        expect(
            extractMissingParamFromKcbpResponse('90001', '没有fundid项的数据 fundid=12345'),
        ).toEqual({ name: 'fundid', value: '12345' });
    });

    it('extracts from 入参 pattern', () => {
        expect(extractMissingParamFromKcbpResponse('90001', '入参 market 缺失 market: SH')).toEqual(
            {
                name: 'market',
                value: 'SH',
            },
        );
    });

    it('scans data rows when top-level message has no match', () => {
        expect(
            extractMissingParamFromKcbpResponse('0', 'ok', [
                { code: '90001', msg: '没有custid项的数据 custid=999' },
            ]),
        ).toEqual({ name: 'custid', value: '999' });
    });

    it('returns null for unrelated errors', () => {
        expect(extractMissingParamFromKcbpResponse('-1', 'connection failed')).toBeNull();
    });
});

describe('mergeParamIntoList', () => {
    const base: ParamItem[] = [{ name: 'fundid', value: '1', type: 'string' }];

    it('appends new param when name not found', () => {
        expect(mergeParamIntoList(base, 'market', 'SH')).toEqual([
            ...base,
            { name: 'market', value: 'SH', type: 'string' },
        ]);
    });

    it('updates existing param case-insensitively', () => {
        expect(mergeParamIntoList(base, 'FundID', '2')).toEqual([
            { name: 'fundid', value: '2', type: 'string' },
        ]);
    });

    it('promotes disabled type to string when merging value', () => {
        const params: ParamItem[] = [{ name: 'fundid', value: '', type: 'disabled' }];
        expect(mergeParamIntoList(params, 'fundid', '100')).toEqual([
            { name: 'fundid', value: '100', type: 'string' },
        ]);
    });

    it('returns same array reference when nothing changes', () => {
        expect(mergeParamIntoList(base, 'fundid', '1')).toBe(base);
    });

    it('ignores blank names', () => {
        expect(mergeParamIntoList(base, '  ', 'x')).toBe(base);
    });
});
