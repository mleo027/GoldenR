import { useMemo } from 'react';
import type { ProjectData } from '../types/workspace';
import {
    matchesCaseSearch,
    matchesProjectSearch,
    compareCasesByMsgtype,
} from '../utils/workspace/caseLabel';
import { parseCaseSearchQuery } from '../utils/workspace/caseSearch';

export interface VisibleCaseItem {
    caseItem: ProjectData['cases'][number];
    caseIndex: number;
}

export interface VisibleProjectItem {
    project: ProjectData;
    projectIndex: number;
    cases: VisibleCaseItem[];
    expanded: boolean;
}

export function useVisibleProjects(
    projects: ProjectData[],
    expandedProjectIds: string[],
    searchKeyword: string,
): VisibleProjectItem[] {
    return useMemo(() => {
        const keyword = searchKeyword.trim();
        const parsedQuery = parseCaseSearchQuery(searchKeyword);

        return projects
            .map((project, projectIndex) => {
                if (!matchesProjectSearch(project.name, project.cases, keyword)) {
                    return null;
                }

                const projectMatched =
                    parsedQuery.term &&
                    (parsedQuery.mode === 'project-only' ||
                        project.name.toLowerCase().includes(parsedQuery.term));
                const cases = project.cases
                    .map((caseItem, caseIndex) => ({ caseItem, caseIndex }))
                    .filter(
                        ({ caseItem, caseIndex }) =>
                            projectMatched || matchesCaseSearch(caseItem, caseIndex, keyword),
                    )
                    .sort((a, b) => compareCasesByMsgtype(a.caseItem, b.caseItem));

                return {
                    project,
                    projectIndex,
                    cases,
                    expanded: keyword ? true : expandedProjectIds.includes(project.id),
                };
            })
            .filter((item) => item != null);
    }, [expandedProjectIds, projects, searchKeyword]);
}
