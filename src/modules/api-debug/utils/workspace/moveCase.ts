import { createEmptyProject } from '../../constants/workspace';
import type { ProjectData } from '../../types/workspace';
import { resolveCaseIndexById, sortCasesByMsgtype } from './caseLabel';

export interface MoveCaseParams {
    fromProjectIndex: number;
    fromCaseIndex: number;
    toProjectIndex: number;
}

export interface MoveCaseResult {
    projects: ProjectData[];
    adjustedToProjectIndex: number;
    movedCaseId: string;
    movedCaseIndex: number;
    removedSourceProject: boolean;
}

export function moveCaseInProjects(
    projects: ProjectData[],
    params: MoveCaseParams,
): MoveCaseResult | null {
    const { fromProjectIndex, fromCaseIndex, toProjectIndex } = params;
    if (fromProjectIndex === toProjectIndex) return null;

    const sourceProject = projects[fromProjectIndex];
    const targetProject = projects[toProjectIndex];
    if (!sourceProject || !targetProject) return null;

    const movedCase = sourceProject.cases[fromCaseIndex];
    if (!movedCase) return null;

    const sourceCasesAfterRemove = sourceProject.cases.filter(
        (_, index) => index !== fromCaseIndex,
    );
    let nextProjects: ProjectData[];
    let adjustedToProjectIndex = toProjectIndex;
    let removedSourceProject = false;

    if (sourceCasesAfterRemove.length === 0) {
        nextProjects = projects.filter((_, index) => index !== fromProjectIndex);
        removedSourceProject = true;
        if (fromProjectIndex < toProjectIndex) {
            adjustedToProjectIndex = toProjectIndex - 1;
        }
        if (nextProjects.length === 0) {
            const project = createEmptyProject(1);
            return {
                projects: [project],
                adjustedToProjectIndex: 0,
                movedCaseId: movedCase.id,
                movedCaseIndex: 0,
                removedSourceProject: true,
            };
        }
    } else {
        nextProjects = projects.map((project, index) =>
            index === fromProjectIndex
                ? { ...project, cases: sourceCasesAfterRemove, updatedAt: Date.now() }
                : project,
        );
    }

    const targetCases = sortCasesByMsgtype([
        ...nextProjects[adjustedToProjectIndex].cases,
        { ...movedCase, updatedAt: Date.now() },
    ]);

    nextProjects = nextProjects.map((project, index) =>
        index === adjustedToProjectIndex
            ? { ...project, cases: targetCases, updatedAt: Date.now() }
            : project,
    );

    return {
        projects: nextProjects,
        adjustedToProjectIndex,
        movedCaseId: movedCase.id,
        movedCaseIndex: resolveCaseIndexById(targetCases, movedCase.id),
        removedSourceProject,
    };
}
