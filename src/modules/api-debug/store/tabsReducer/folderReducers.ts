import { isCaseFolderDescendant } from '../../utils/workspace/caseFolders';
import { ensureExpanded, withLoaded } from './helpers';
import type { TabsAction, TabsState } from './types';

export type FolderAction = Extract<
    TabsAction,
    { type: 'ADD_FOLDER' | 'RENAME_FOLDER' | 'DELETE_FOLDER' | 'MOVE_CASE_TO_FOLDER' }
>;

function isValidFolderTarget(
    project: TabsState['projects'][number],
    folderId: string | undefined,
): boolean {
    return !folderId || Boolean(project.folders?.some((folder) => folder.id === folderId));
}

export function reduceFolderAction(state: TabsState, action: FolderAction): TabsState {
    const project = state.projects[action.projectIndex];
    if (!project) return state;

    switch (action.type) {
        case 'ADD_FOLDER': {
            const now = Date.now();
            const folders = project.folders ?? [];
            const position = folders.filter((folder) => folder.parentId === action.parentId).length;
            const folder = {
                id: `${now}-folder`,
                name: action.name?.trim() || '新建目录',
                parentId: action.parentId,
                position,
                createdAt: now,
                updatedAt: now,
            };
            const projects = state.projects.map((item, index) =>
                index === action.projectIndex
                    ? { ...item, folders: [...folders, folder], updatedAt: now }
                    : item,
            );
            return withLoaded(state, {
                projects,
                activeProjectIndex: state.activeProjectIndex,
                activeCaseIndex: state.activeCaseIndex,
                expandedProjectIds: ensureExpanded(state, project.id),
            });
        }
        case 'RENAME_FOLDER': {
            if (!project.folders?.some((folder) => folder.id === action.folderId)) return state;
            const now = Date.now();
            const folders = project.folders.map((folder) =>
                folder.id === action.folderId
                    ? { ...folder, name: action.name.trim() || folder.name, updatedAt: now }
                    : folder,
            );
            return {
                ...state,
                projects: state.projects.map((item, index) =>
                    index === action.projectIndex ? { ...item, folders, updatedAt: now } : item,
                ),
            };
        }
        case 'DELETE_FOLDER': {
            if (!project.folders?.some((folder) => folder.id === action.folderId)) return state;
            const removed = new Set([
                action.folderId,
                ...project.folders
                    .filter((folder) =>
                        isCaseFolderDescendant(project.folders ?? [], action.folderId, folder.id),
                    )
                    .map((folder) => folder.id),
            ]);
            const folders = project.folders.filter((folder) => !removed.has(folder.id));
            const cases = project.cases.map((item) =>
                removed.has(item.folderId ?? '') ? { ...item, folderId: undefined } : item,
            );
            return {
                ...state,
                projects: state.projects.map((item, index) =>
                    index === action.projectIndex
                        ? { ...item, folders, cases, updatedAt: Date.now() }
                        : item,
                ),
            };
        }
        case 'MOVE_CASE_TO_FOLDER': {
            if (!isValidFolderTarget(project, action.folderId)) return state;
            const now = Date.now();
            const cases = project.cases.map((item) =>
                item.id === action.caseId
                    ? { ...item, folderId: action.folderId, updatedAt: now }
                    : item,
            );
            return {
                ...state,
                projects: state.projects.map((item, index) =>
                    index === action.projectIndex ? { ...item, cases, updatedAt: now } : item,
                ),
            };
        }
    }
}
