import { describe, expect, it } from 'vitest';
import type { ProjectData } from '../../types/workspace';
import {
    ensureCaseOpen,
    findCaseLocation,
    resolveCloseTabTarget,
    sanitizeOpenCaseIds,
} from './openCaseTabs';

function createProjects(): ProjectData[] {
    return [
        {
            id: 'p1',
            name: '项目 1',
            createdAt: 1,
            updatedAt: 1,
            cases: [
                {
                    id: 'c1',
                    name: '接口 1',
                    protocol: 'KCBP',
                    address: '',
                    params: [],
                    createdAt: 1,
                    updatedAt: 1,
                },
                {
                    id: 'c2',
                    name: '接口 2',
                    protocol: 'KCBP',
                    address: '',
                    params: [],
                    createdAt: 1,
                    updatedAt: 1,
                },
            ],
        },
    ];
}

describe('openCaseTabs', () => {
    it('findCaseLocation resolves project and case indexes', () => {
        expect(findCaseLocation(createProjects(), 'c2')).toEqual({
            projectIndex: 0,
            caseIndex: 1,
        });
    });

    it('ensureCaseOpen appends without duplicates', () => {
        expect(ensureCaseOpen(['c1'], 'c2')).toEqual(['c1', 'c2']);
        expect(ensureCaseOpen(['c1', 'c2'], 'c1')).toEqual(['c1', 'c2']);
    });

    it('sanitizeOpenCaseIds keeps active case and drops stale ids', () => {
        expect(sanitizeOpenCaseIds(createProjects(), ['c1', 'missing'], 0, 1)).toEqual([
            'c1',
            'c2',
        ]);
    });

    it('sanitizeOpenCaseIds falls back to active case when empty', () => {
        expect(sanitizeOpenCaseIds(createProjects(), [], 0, 0)).toEqual(['c1']);
    });

    it('resolveCloseTabTarget picks neighbor tab', () => {
        expect(resolveCloseTabTarget(['c1', 'c2', 'c3'], 'c2')).toBe('c3');
        expect(resolveCloseTabTarget(['c1', 'c2'], 'c2')).toBe('c1');
        expect(resolveCloseTabTarget(['c1'], 'c1')).toBeNull();
    });
});
