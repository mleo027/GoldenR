import { createEmptyProject } from '../../constants/workspace';
import { collectProjectCaseIds, sanitizeOpenCaseIds } from '../../utils/workspace/openCaseTabs';
import { ensureExpanded, withLoaded } from './helpers';
import type { TabsAction, TabsState } from './types';
import { isCaseFolderDescendant } from '../../utils/workspace/caseFolders';

type ProjectAction = Extract<
    TabsAction,
    {
        type:
            | 'ADD_PROJECT'
            | 'DELETE_PROJECT'
            | 'RENAME_PROJECT'
            | 'TOGGLE_PROJECT_EXPAND'
            | 'SET_PROJECT_COMMON_PARAM_SET'
            | 'ADD_FOLDER'
            | 'RENAME_FOLDER'
            | 'DELETE_FOLDER'
            | 'MOVE_CASE_TO_FOLDER';
    }
>;

export function reduceProjectAction(state: TabsState, action: ProjectAction): TabsState {
    switch (action.type) {
        case 'ADD_FOLDER': {
            const project = state.projects[action.projectIndex];
            if (!project) return state;
            const now = Date.now();
            const folders = project.folders ?? [];
            const siblings = folders.filter((folder) => folder.parentId === action.parentId);
            const folder = {
                id: `${now}-folder`,
                name: action.name?.trim() || '新建目录',
                parentId: action.parentId,
                position: siblings.length,
                createdAt: now,
                updatedAt: now,
            };
            const nextProjects = state.projects.map((item, index) =>
                index === action.projectIndex
                    ? { ...item, folders: [...folders, folder], updatedAt: now }
                    : item,
            );
            return withLoaded(state, {
                projects: nextProjects,
                activeProjectIndex: state.activeProjectIndex,
                activeCaseIndex: state.activeCaseIndex,
                expandedProjectIds: ensureExpanded(state, project.id),
            });
        }
        case 'RENAME_FOLDER': {
            const project = state.projects[action.projectIndex];
            if (!project || !project.folders?.some((folder) => folder.id === action.folderId))
                return state;
            const folders = project.folders.map((folder) =>
                folder.id === action.folderId
                    ? { ...folder, name: action.name.trim() || folder.name, updatedAt: Date.now() }
                    : folder,
            );
            return {
                ...state,
                projects: state.projects.map((item, index) =>
                    index === action.projectIndex
                        ? { ...item, folders, updatedAt: Date.now() }
                        : item,
                ),
            };
        }
        case 'DELETE_FOLDER': {
            const project = state.projects[action.projectIndex];
            if (!project?.folders?.some((folder) => folder.id === action.folderId)) return state;
            const removed = new Set([
                action.folderId,
                ...project.folders
                    .filter((folder) =>
                        isCaseFolderDescendant(project.folders ?? [], action.folderId, folder.id),
                    )
                    .map((folder) => folder.id),
            ]);
            const folders = project.folders.filter((folder) => !removed.has(folder.id));
            const cases = project.cases.map((caseItem) =>
                removed.has(caseItem.folderId ?? '')
                    ? { ...caseItem, folderId: undefined }
                    : caseItem,
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
            const project = state.projects[action.projectIndex];
            if (
                !project ||
                (action.folderId &&
                    !project.folders?.some((folder) => folder.id === action.folderId))
            )
                return state;
            const cases = project.cases.map((caseItem) =>
                caseItem.id === action.caseId
                    ? { ...caseItem, folderId: action.folderId, updatedAt: Date.now() }
                    : caseItem,
            );
            return {
                ...state,
                projects: state.projects.map((item, index) =>
                    index === action.projectIndex
                        ? { ...item, cases, updatedAt: Date.now() }
                        : item,
                ),
            };
        }
        case 'ADD_PROJECT': {
            const newProject = createEmptyProject(state.projects.length + 1);
            if (action.initialAddress && newProject.cases[0]) {
                newProject.cases[0] = {
                    ...newProject.cases[0],
                    address: action.initialAddress,
                    ...(action.initialProtocol ? { protocol: action.initialProtocol } : {}),
                };
            }
            return withLoaded(state, {
                projects: [...state.projects, newProject],
                activeProjectIndex: state.projects.length,
                activeCaseIndex: 0,
                expandedProjectIds: [...state.expandedProjectIds, newProject.id],
            });
        }

        case 'DELETE_PROJECT': {
            const nextProjects = state.projects.filter((_, index) => index !== action.projectIndex);
            if (nextProjects.length === 0) {
                const project = createEmptyProject(1);
                return withLoaded(state, {
                    projects: [project],
                    activeProjectIndex: 0,
                    activeCaseIndex: 0,
                    expandedProjectIds: [project.id],
                });
            }

            let activeProjectIndex = state.activeProjectIndex;
            if (action.projectIndex < state.activeProjectIndex) {
                activeProjectIndex--;
            } else if (action.projectIndex === state.activeProjectIndex) {
                activeProjectIndex = Math.min(action.projectIndex, nextProjects.length - 1);
            }

            const activeCaseIndex = Math.min(
                state.activeCaseIndex,
                nextProjects[activeProjectIndex].cases.length - 1,
            );

            return withLoaded(state, {
                projects: nextProjects,
                activeProjectIndex,
                activeCaseIndex,
                expandedProjectIds: state.expandedProjectIds.filter((id) =>
                    nextProjects.some((project) => project.id === id),
                ),
                openCaseIds: sanitizeOpenCaseIds(
                    nextProjects,
                    state.openCaseIds.filter(
                        (id) => !collectProjectCaseIds(state.projects, action.projectIndex).has(id),
                    ),
                    activeProjectIndex,
                    activeCaseIndex,
                ),
            });
        }

        case 'RENAME_PROJECT': {
            const nextProjects = state.projects.map((project, index) =>
                index === action.projectIndex
                    ? { ...project, name: action.name, updatedAt: Date.now() }
                    : project,
            );
            return { ...state, projects: nextProjects };
        }

        case 'TOGGLE_PROJECT_EXPAND': {
            const expanded = state.expandedProjectIds.includes(action.projectId)
                ? state.expandedProjectIds.filter((id) => id !== action.projectId)
                : [...state.expandedProjectIds, action.projectId];
            return { ...state, expandedProjectIds: expanded };
        }

        case 'SET_PROJECT_COMMON_PARAM_SET': {
            const project = state.projects[action.projectIndex];
            if (!project) return state;
            const nextProjects = state.projects.map((item, index) =>
                index === action.projectIndex
                    ? {
                          ...item,
                          ...(action.setId === null
                              ? { commonParamSetId: undefined }
                              : { commonParamSetId: action.setId }),
                          updatedAt: Date.now(),
                      }
                    : item,
            );
            return { ...state, projects: nextProjects };
        }
    }
}
