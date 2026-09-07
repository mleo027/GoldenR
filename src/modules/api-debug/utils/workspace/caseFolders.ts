import type { CaseFolder, ProjectData, TabData } from '../../types/workspace';

export interface CaseFolderTreeNode {
    folder: CaseFolder;
    folders: CaseFolderTreeNode[];
    cases: Array<{ caseItem: TabData; caseIndex: number }>;
}

export function buildCaseFolderTree(project: ProjectData): {
    root: CaseFolderTreeNode[];
    rootCases: Array<{ caseItem: TabData; caseIndex: number }>;
} {
    const folders = project.folders ?? [];
    const byParent = new Map<string | undefined, CaseFolder[]>();
    const knownIds = new Set(folders.map((folder) => folder.id));
    for (const folder of folders) {
        const parentId =
            folder.parentId && knownIds.has(folder.parentId) ? folder.parentId : undefined;
        const siblings = byParent.get(parentId) ?? [];
        siblings.push(folder);
        byParent.set(parentId, siblings);
    }
    const casesByFolder = new Map<
        string | undefined,
        Array<{ caseItem: TabData; caseIndex: number }>
    >();
    project.cases.forEach((caseItem, caseIndex) => {
        const folderId =
            caseItem.folderId && knownIds.has(caseItem.folderId) ? caseItem.folderId : undefined;
        const cases = casesByFolder.get(folderId) ?? [];
        cases.push({ caseItem, caseIndex });
        casesByFolder.set(folderId, cases);
    });
    const build = (folder: CaseFolder, ancestors: Set<string>): CaseFolderTreeNode => {
        if (ancestors.has(folder.id)) throw new Error(`Case folder cycle detected: ${folder.id}`);
        const nextAncestors = new Set(ancestors).add(folder.id);
        return {
            folder,
            folders: (byParent.get(folder.id) ?? [])
                .sort((a, b) => a.position - b.position)
                .map((child) => build(child, nextAncestors)),
            cases: casesByFolder.get(folder.id) ?? [],
        };
    };
    return {
        root: (byParent.get(undefined) ?? [])
            .sort((a, b) => a.position - b.position)
            .map((folder) => build(folder, new Set())),
        rootCases: casesByFolder.get(undefined) ?? [],
    };
}

export function isCaseFolderDescendant(
    folders: CaseFolder[],
    folderId: string,
    candidateId: string,
): boolean {
    const byParent = new Map<string, string[]>();
    for (const folder of folders) {
        const children = byParent.get(folder.parentId ?? '') ?? [];
        children.push(folder.id);
        byParent.set(folder.parentId ?? '', children);
    }
    const pending = [...(byParent.get(folderId) ?? [])];
    while (pending.length) {
        const current = pending.pop();
        if (!current) continue;
        if (current === candidateId) return true;
        pending.push(...(byParent.get(current) ?? []));
    }
    return false;
}

export function getCaseFolderPath(folders: CaseFolder[], folderId?: string): string[] {
    const byId = new Map(folders.map((folder) => [folder.id, folder]));
    const path: string[] = [];
    const visited = new Set<string>();
    let current = folderId ? byId.get(folderId) : undefined;
    while (current) {
        if (visited.has(current.id)) throw new Error(`Case folder cycle detected: ${current.id}`);
        visited.add(current.id);
        path.unshift(current.name);
        current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    return path;
}
