import { describe, expect, it } from 'vitest';
import type { TabData } from '../../types/workspace';
import {
    resolveMsgtypeFromParams,
    shouldResortCasesForUpdate,
    sortCasesByMsgtype,
} from './caseLabel';

function mockCase(msgtype: string, name = '接口'): TabData {
    return {
        id: msgtype,
        name,
        protocol: 'KCBP',
        address: `127.0.0.1:21000/${msgtype}?queue=req1&timeout=15`,
        params: [],
        createdAt: 0,
        updatedAt: 0,
    };
}

describe('sortCasesByMsgtype', () => {
    it('sorts numeric msgtype ascending', () => {
        const sorted = sortCasesByMsgtype([
            mockCase('410203'),
            mockCase('150501'),
            mockCase('150502'),
        ]);

        expect(sorted.map((item) => item.id)).toEqual(['150501', '150502', '410203']);
    });

    it('keeps favorites before non-favorites', () => {
        const favorite = { ...mockCase('999999'), favorite: true };
        const sorted = sortCasesByMsgtype([mockCase('150501'), favorite]);

        expect(sorted[0].id).toBe('999999');
    });
});

describe('resolveMsgtypeFromParams', () => {
    it('resolves funcid or g_funcid from enabled params', () => {
        expect(
            resolveMsgtypeFromParams([{ name: 'funcid', value: '410411', type: 'string' }]),
        ).toBe('410411');
        expect(
            resolveMsgtypeFromParams([{ name: 'g_funcid', value: '150501', type: 'string' }]),
        ).toBe('150501');
    });

    it('prefers g_funcid and ignores disabled params', () => {
        expect(
            resolveMsgtypeFromParams([
                { name: 'funcid', value: '410411', type: 'string' },
                { name: 'g_funcid', value: '150501', type: 'string' },
                { name: 'funcid2', value: '999999', type: 'string' },
            ]),
        ).toBe('150501');
        expect(
            resolveMsgtypeFromParams([{ name: 'funcid', value: '410411', type: 'disabled' }]),
        ).toBe('');
    });
});

describe('shouldResortCasesForUpdate', () => {
    it('returns false for params-only updates', () => {
        const current = mockCase('150501');
        expect(
            shouldResortCasesForUpdate(
                { params: [{ name: 'g_clientid', value: '1', type: 'string' }] },
                current,
            ),
        ).toBe(false);
    });

    it('returns true when address msgtype changes', () => {
        const current = mockCase('150501');
        expect(
            shouldResortCasesForUpdate(
                { address: '127.0.0.1:21000/150502?queue=req1&timeout=15' },
                current,
            ),
        ).toBe(true);
    });
});
