import { useCallback } from 'react';
import { useInlineRename, type RenameTarget } from '../../../../hooks/useInlineRename';
import type { ProjectData } from '../../types/workspace';

interface Config {
    projects: ProjectData[];
    renameProject(projectIndex: number, name: string): void;
    renameFolder(projectIndex: number, folderId: string, name: string): void;
    renameCase(projectIndex: number, caseIndex: number, name: string): void;
}

export function useCaseSidebarRename(config: Config) {
    const { projects, renameProject, renameFolder, renameCase } = config;
    const getName = useCallback(
        (target: RenameTarget) => {
            const project = projects[target.projectIndex];
            if (target.type === 'project') return project.name;
            if (target.type === 'folder') {
                return project.folders?.find((folder) => folder.id === target.folderId)?.name ?? '';
            }
            return project.cases[target.caseIndex].name;
        },
        [projects],
    );

    const commit = useCallback(
        (target: RenameTarget, name: string) => {
            if (target.type === 'project') renameProject(target.projectIndex, name);
            else if (target.type === 'folder') {
                renameFolder(target.projectIndex, target.folderId, name);
            } else renameCase(target.projectIndex, target.caseIndex, name);
        },
        [renameCase, renameFolder, renameProject],
    );

    return useInlineRename(getName, commit);
}
