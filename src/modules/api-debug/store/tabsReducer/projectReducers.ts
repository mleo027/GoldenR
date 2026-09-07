import { createEmptyProject } from '../../constants/workspace';
import { collectProjectCaseIds, sanitizeOpenCaseIds } from '../../utils/workspace/openCaseTabs';
import { withLoaded } from './helpers';
import type { TabsAction, TabsState } from './types';

type ProjectAction = Extract<
    TabsAction,
    {
        type:
            | 'ADD_PROJECT'
            | 'DELETE_PROJECT'
            | 'RENAME_PROJECT'
            | 'TOGGLE_PROJECT_EXPAND'
            | 'SET_PROJECT_COMMON_PARAM_SET';
    }
>;

export function reduceProjectAction(state: TabsState, action: ProjectAction): TabsState {
    switch (action.type) {
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
