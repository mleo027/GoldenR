import type { ProjectData } from '../../types/workspace';

export interface CaseLocation {
    projectIndex: number;
    caseIndex: number;
}

export function findCaseLocation(projects: ProjectData[], caseId: string): CaseLocation | null {
    for (let projectIndex = 0; projectIndex < projects.length; projectIndex++) {
        const caseIndex = projects[projectIndex].cases.findIndex((item) => item.id === caseId);
        if (caseIndex >= 0) {
            return { projectIndex, caseIndex };
        }
    }
    return null;
}

export function getActiveCaseId(
    projects: ProjectData[],
    activeProjectIndex: number,
    activeCaseIndex: number,
): string | null {
    return projects[activeProjectIndex]?.cases[activeCaseIndex]?.id ?? null;
}

export function ensureCaseOpen(openCaseIds: string[], caseId: string): string[] {
    if (openCaseIds.includes(caseId)) return openCaseIds;
    return [...openCaseIds, caseId];
}

export function collectProjectCaseIds(projects: ProjectData[], projectIndex: number): Set<string> {
    const project = projects[projectIndex];
    if (!project) return new Set();
    return new Set(project.cases.map((item) => item.id));
}

export function sanitizeOpenCaseIds(
    projects: ProjectData[],
    openCaseIds: string[] | undefined,
    activeProjectIndex: number,
    activeCaseIndex: number,
): string[] {
    const validIds = new Set<string>();
    for (const project of projects) {
        for (const item of project.cases) {
            validIds.add(item.id);
        }
    }

    const activeId = getActiveCaseId(projects, activeProjectIndex, activeCaseIndex);
    const sanitized = (openCaseIds ?? []).filter((id) => validIds.has(id));

    if (activeId && !sanitized.includes(activeId)) {
        sanitized.push(activeId);
    }

    if (sanitized.length === 0 && activeId) {
        return [activeId];
    }

    return sanitized;
}

export function resolveCloseTabTarget(openCaseIds: string[], closingCaseId: string): string | null {
    if (openCaseIds.length <= 1) return null;

    const index = openCaseIds.indexOf(closingCaseId);
    if (index < 0) return null;

    const remaining = openCaseIds.filter((id) => id !== closingCaseId);
    return remaining[Math.min(index, remaining.length - 1)] ?? remaining[0] ?? null;
}
