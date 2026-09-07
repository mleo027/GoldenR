import { useMemo } from 'react';
import type { ProjectData } from '../types/workspace';
import {
    matchesCaseSearch,
    matchesProjectSearch,
    compareCasesByMsgtype,
} from '../utils/workspace/caseLabel';
import { parseCaseSearchQuery } from '../utils/workspace/caseSearch';
import { buildCaseFolderTree, type CaseFolderTreeNode } from '../utils/workspace/caseFolders';

export interface VisibleCaseItem {
    caseItem: ProjectData['cases'][number];
    caseIndex: number;
}

export interface VisibleProjectItem {
    project: ProjectData;
    projectIndex: number;
    cases: VisibleCaseItem[];
    expanded: boolean;
    folders: CaseFolderTreeNode[];
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

                const projectMatched = Boolean(
                    parsedQuery.term &&
                    (parsedQuery.mode === 'project-only' ||
                        project.name.toLowerCase().includes(parsedQuery.term)),
                );
                const visibleFolderData = buildVisibleFolders(project, keyword, projectMatched);
                const cases = visibleFolderData.rootCases
                    .filter(
                        ({ caseItem, caseIndex }) =>
                            projectMatched || matchesCaseSearch(caseItem, caseIndex, keyword),
                    )
                    .sort((a, b) => compareCasesByMsgtype(a.caseItem, b.caseItem));
                return {
                    project,
                    projectIndex,
                    cases,
                    folders: visibleFolderData.folders,
                    expanded: keyword ? true : expandedProjectIds.includes(project.id),
                };
            })
            .filter((item) => item != null);
    }, [expandedProjectIds, projects, searchKeyword]);
}

function buildVisibleFolders(
    project: ProjectData,
    keyword: string,
    projectMatched: boolean | undefined,
): { folders: CaseFolderTreeNode[]; rootCases: VisibleCaseItem[] } {
    const { root, rootCases } = buildCaseFolderTree(project);
    if (!keyword || projectMatched) return { folders: root, rootCases };
    const filter = (node: CaseFolderTreeNode): CaseFolderTreeNode | null => {
        const folders = node.folders
            .map(filter)
            .filter((item): item is CaseFolderTreeNode => item !== null);
        const cases = node.cases.filter(({ caseItem, caseIndex }) =>
            matchesCaseSearch(caseItem, caseIndex, keyword),
        );
        return folders.length || cases.length ? { ...node, folders, cases } : null;
    };
    return {
        folders: root.map(filter).filter((item): item is CaseFolderTreeNode => item !== null),
        rootCases: rootCases.filter(({ caseItem, caseIndex }) =>
            matchesCaseSearch(caseItem, caseIndex, keyword),
        ),
    };
}
