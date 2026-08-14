import { describe, expect, it } from 'vitest';
import { buildCaseIndex, resolveCaseRef } from './resolveCase';
import type { TcdCaseTab, TcdProjectSnapshot } from './types';

function makeCase(id: string, name: string, msgtype: string): TcdCaseTab {
    return {
        id,
        name,
        address: `127.0.0.1:21000/${msgtype}`,
        params: [],
    };
}

describe('resolveCase', () => {
    const projects: TcdProjectSnapshot[] = [
        {
            id: 'p1',
            name: 'Project',
            cases: [makeCase('c1', 'Case1', '1001'), makeCase('c2', 'Case2', '1002')],
        },
    ];

    it('resolves by caseId', () => {
        const index = buildCaseIndex(projects);
        expect(resolveCaseRef('c1', index).id).toBe('c1');
    });

    it('resolves by unique msgtype', () => {
        const index = buildCaseIndex(projects);
        expect(resolveCaseRef('1002', index).id).toBe('c2');
    });

    it('rejects duplicate msgtype', () => {
        const dupProjects: TcdProjectSnapshot[] = [
            {
                id: 'p1',
                name: 'Project',
                cases: [makeCase('c1', 'A', '1001'), makeCase('c2', 'B', '1001')],
            },
        ];
        const index = buildCaseIndex(dupProjects);
        expect(() => resolveCaseRef('1001', index)).toThrow(/对应 2 个用例/);
    });
});
