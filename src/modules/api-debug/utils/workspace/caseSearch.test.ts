import { describe, expect, it } from 'vitest';
import type { TabData } from '../../types/workspace';
import {
    getCaseSearchHighlightTerm,
    matchesCaseSearchQuery,
    matchesProjectSearchQuery,
    parseCaseSearchQuery,
    splitTextHighlight,
} from './caseSearch';

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

describe('caseSearch', () => {
    it('parses msgtype prefix query', () => {
        expect(parseCaseSearchQuery('4101*')).toEqual({
            raw: '4101*',
            mode: 'msgtype-prefix',
            term: '4101',
        });
    });

    it('parses project-only query', () => {
        expect(parseCaseSearchQuery('项目:清算')).toEqual({
            raw: '项目:清算',
            mode: 'project-only',
            term: '清算',
        });
    });

    it('matches msgtype prefix', () => {
        const query = parseCaseSearchQuery('4101*');
        expect(matchesCaseSearchQuery(mockCase('410101'), 0, query)).toBe(true);
        expect(matchesCaseSearchQuery(mockCase('410201'), 0, query)).toBe(false);
    });

    it('matches project-only without cases', () => {
        expect(matchesProjectSearchQuery('清算项目', [mockCase('410101')], '项目:交易')).toBe(
            false,
        );
        expect(matchesProjectSearchQuery('清算项目', [mockCase('410101')], '项目:清算')).toBe(true);
    });

    it('splits highlight parts', () => {
        expect(splitTextHighlight('410101:资金解冻', '4101')).toEqual([
            { text: '4101', highlight: true },
            { text: '01:资金解冻', highlight: false },
        ]);
    });

    it('returns empty highlight term for project-only', () => {
        expect(getCaseSearchHighlightTerm(parseCaseSearchQuery('项目:清算'))).toBe('');
    });
});
