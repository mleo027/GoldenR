import { describe, expect, it } from 'vitest';
import {
    getMsgtypeGroupKey,
    groupCasesByMsgtypePrefix,
    shouldGroupCasesByMsgtype,
} from './caseMsgtypeGroup';

describe('caseMsgtypeGroup', () => {
    it('groups cases by msgtype prefix', () => {
        const groups = groupCasesByMsgtypePrefix([
            {
                caseIndex: 0,
                caseItem: {
                    id: '1',
                    name: 'A',
                    protocol: 'KCBP',
                    address: '127.0.0.1/410101',
                    params: [],
                    createdAt: 1,
                    updatedAt: 1,
                },
            },
            {
                caseIndex: 1,
                caseItem: {
                    id: '2',
                    name: 'B',
                    protocol: 'KCBP',
                    address: '127.0.0.1/410201',
                    params: [],
                    createdAt: 1,
                    updatedAt: 1,
                },
            },
        ]);

        expect(groups).toHaveLength(2);
        expect(groups[0]?.key).toBe('4101');
        expect(groups[0]?.label).toBe('4101 · 外围主题');
        expect(groups[1]?.key).toBe('4102');
    });

    it('detects when grouping should be enabled', () => {
        expect(shouldGroupCasesByMsgtype(30, '')).toBe(true);
        expect(shouldGroupCasesByMsgtype(29, '')).toBe(false);
        expect(shouldGroupCasesByMsgtype(40, '4101')).toBe(false);
    });

    it('falls back to other bucket without msgtype', () => {
        expect(getMsgtypeGroupKey('')).toBe('other');
    });
});
