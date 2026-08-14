import type { TabData } from '../../types/workspace';
import { cloneCase, createEmptyCase } from '../../constants/workspace';
import {
    resolveCaseIndexById,
    shouldResortCasesForUpdate,
    sortCasesByMsgtype,
} from '../../utils/workspace/caseLabel';
import {
    collectProjectCaseIds,
    ensureCaseOpen,
    findCaseLocation,
    getActiveCaseId,
    resolveCloseTabTarget,
    sanitizeOpenCaseIds,
} from '../../utils/workspace/openCaseTabs';
import { moveCaseInProjects } from '../../utils/workspace/moveCase';
import { ensureExpanded, withLoaded } from './helpers';
import { reduceProjectAction } from './projectReducers';
import type { TabsAction, TabsState } from './types';

type CaseAction = Extract<
    TabsAction,
    {
        type:
            | 'ADD_CASE'
            | 'DUPLICATE_CASE'
            | 'DELETE_CASE'
            | 'SELECT_CASE'
            | 'CLOSE_CASE_TAB'
            | 'UPDATE_ACTIVE_CASE'
            | 'RENAME_CASE'
            | 'TOGGLE_CASE_FAVORITE'
            | 'MOVE_CASE'
            | 'IMPORT_CASES';
    }
>;

export function reduceCaseAction(state: TabsState, action: CaseAction): TabsState {
    switch (action.type) {
        case 'ADD_CASE': {
            const projectIndex = action.projectIndex ?? state.activeProjectIndex;
            const targetProject = state.projects[projectIndex];
            if (!targetProject) return state;

            const newCase = createEmptyCase(targetProject.cases.length + 1);
            if (action.initialAddress) {
                newCase.address = action.initialAddress;
            }
            const nextCases = sortCasesByMsgtype([...targetProject.cases, newCase]);

            const nextProjects = state.projects.map((project, index) =>
                index === projectIndex
                    ? {
                          ...project,
                          cases: nextCases,
                          updatedAt: Date.now(),
                      }
                    : project,
            );

            return withLoaded(state, {
                projects: nextProjects,
                activeProjectIndex: projectIndex,
                activeCaseIndex: resolveCaseIndexById(nextCases, newCase.id),
                expandedProjectIds: ensureExpanded(state, targetProject.id),
            });
        }

        case 'DUPLICATE_CASE': {
            const sourceProject = state.projects[action.projectIndex];
            const sourceCase = sourceProject?.cases[action.caseIndex];
            if (!sourceProject || !sourceCase) return state;

            const newCase = cloneCase(sourceCase);
            const nextCases = [...sourceProject.cases];
            nextCases.splice(action.caseIndex + 1, 0, newCase);
            const sortedCases = sortCasesByMsgtype(nextCases);

            const nextProjects = state.projects.map((project, index) =>
                index === action.projectIndex
                    ? { ...project, cases: sortedCases, updatedAt: Date.now() }
                    : project,
            );

            return withLoaded(state, {
                projects: nextProjects,
                activeProjectIndex: action.projectIndex,
                activeCaseIndex: resolveCaseIndexById(sortedCases, newCase.id),
                expandedProjectIds: ensureExpanded(state, sourceProject.id),
            });
        }

        case 'DELETE_CASE': {
            const targetProject = state.projects[action.projectIndex];
            if (!targetProject) return state;

            if (targetProject.cases.length === 1) {
                return reduceProjectAction(state, {
                    type: 'DELETE_PROJECT',
                    projectIndex: action.projectIndex,
                });
            }

            const deletedCaseId = targetProject.cases[action.caseIndex].id;
            const nextCases = targetProject.cases.filter((_, index) => index !== action.caseIndex);

            const nextProjects = state.projects.map((project, index) =>
                index === action.projectIndex
                    ? { ...project, cases: nextCases, updatedAt: Date.now() }
                    : project,
            );

            const activeProjectIndex = state.activeProjectIndex;
            let activeCaseIndex = state.activeCaseIndex;

            if (action.projectIndex === state.activeProjectIndex) {
                if (action.caseIndex < state.activeCaseIndex) {
                    activeCaseIndex--;
                } else if (action.caseIndex === state.activeCaseIndex) {
                    activeCaseIndex = Math.min(action.caseIndex, nextCases.length - 1);
                }
            }

            return {
                ...state,
                projects: nextProjects,
                activeProjectIndex,
                activeCaseIndex,
                expandedProjectIds: ensureExpanded(state, targetProject.id),
                openCaseIds: sanitizeOpenCaseIds(
                    nextProjects,
                    state.openCaseIds.filter((id) => id !== deletedCaseId),
                    activeProjectIndex,
                    activeCaseIndex,
                ),
            };
        }

        case 'SELECT_CASE': {
            const project = state.projects[action.projectIndex];
            const caseItem = project?.cases[action.caseIndex];
            if (!project || !caseItem) return state;

            return {
                ...state,
                activeProjectIndex: action.projectIndex,
                activeCaseIndex: action.caseIndex,
                expandedProjectIds: ensureExpanded(state, project.id),
                openCaseIds: ensureCaseOpen(state.openCaseIds, caseItem.id),
            };
        }

        case 'CLOSE_CASE_TAB': {
            const nextActiveId = resolveCloseTabTarget(state.openCaseIds, action.caseId);
            if (!nextActiveId) return state;

            const nextOpenCaseIds = state.openCaseIds.filter((id) => id !== action.caseId);
            const activeCaseId = getActiveCaseId(
                state.projects,
                state.activeProjectIndex,
                state.activeCaseIndex,
            );

            if (activeCaseId !== action.caseId) {
                return { ...state, openCaseIds: nextOpenCaseIds };
            }

            const location = findCaseLocation(state.projects, nextActiveId);
            if (!location) {
                return { ...state, openCaseIds: nextOpenCaseIds };
            }

            return {
                ...state,
                openCaseIds: nextOpenCaseIds,
                activeProjectIndex: location.projectIndex,
                activeCaseIndex: location.caseIndex,
                expandedProjectIds: ensureExpanded(state, state.projects[location.projectIndex].id),
            };
        }

        case 'UPDATE_ACTIVE_CASE': {
            const activeProject = state.projects[state.activeProjectIndex];
            const activeCase = activeProject?.cases[state.activeCaseIndex];
            if (!activeProject || !activeCase) return state;

            const safeUpdates = { ...action.updates } as Partial<TabData> & {
                response?: unknown;
            };
            if ('response' in safeUpdates) {
                delete safeUpdates.response;
            }

            const updatedCase = { ...activeCase, ...safeUpdates, updatedAt: Date.now() };
            const needsResort = shouldResortCasesForUpdate(safeUpdates, activeCase);

            if (!needsResort) {
                const nextProjects = state.projects.map((project, projectIndex) => {
                    if (projectIndex !== state.activeProjectIndex) return project;
                    return {
                        ...project,
                        updatedAt: Date.now(),
                        cases: project.cases.map((item, caseIndex) =>
                            caseIndex === state.activeCaseIndex ? updatedCase : item,
                        ),
                    };
                });
                return { ...state, projects: nextProjects };
            }

            const nextCases = activeProject.cases.map((item, caseIndex) =>
                caseIndex === state.activeCaseIndex ? updatedCase : item,
            );
            const sortedCases = sortCasesByMsgtype(nextCases);

            const nextProjects = state.projects.map((project, projectIndex) => {
                if (projectIndex !== state.activeProjectIndex) return project;
                return {
                    ...project,
                    updatedAt: Date.now(),
                    cases: sortedCases,
                };
            });

            return {
                ...state,
                projects: nextProjects,
                activeCaseIndex: resolveCaseIndexById(sortedCases, activeCase.id),
            };
        }

        case 'RENAME_CASE': {
            const nextProjects = state.projects.map((project, projectIndex) => {
                if (projectIndex !== action.projectIndex) return project;
                return {
                    ...project,
                    updatedAt: Date.now(),
                    cases: project.cases.map((item, caseIndex) =>
                        caseIndex === action.caseIndex
                            ? { ...item, name: action.name, updatedAt: Date.now() }
                            : item,
                    ),
                };
            });
            return { ...state, projects: nextProjects };
        }

        case 'TOGGLE_CASE_FAVORITE': {
            const targetProject = state.projects[action.projectIndex];
            const targetCase = targetProject?.cases[action.caseIndex];
            if (!targetProject || !targetCase) return state;

            const nextCases = targetProject.cases.map((item, caseIndex) =>
                caseIndex === action.caseIndex
                    ? {
                          ...item,
                          favorite: !item.favorite,
                          updatedAt: Date.now(),
                      }
                    : item,
            );
            const sortedCases = sortCasesByMsgtype(nextCases);

            const nextProjects = state.projects.map((project, projectIndex) => {
                if (projectIndex !== action.projectIndex) return project;
                return {
                    ...project,
                    updatedAt: Date.now(),
                    cases: sortedCases,
                };
            });

            const nextState: TabsState = {
                ...state,
                projects: nextProjects,
            };

            if (
                action.projectIndex === state.activeProjectIndex &&
                action.caseIndex === state.activeCaseIndex
            ) {
                nextState.activeCaseIndex = resolveCaseIndexById(sortedCases, targetCase.id);
            }

            return nextState;
        }

        case 'MOVE_CASE': {
            const result = moveCaseInProjects(state.projects, {
                fromProjectIndex: action.fromProjectIndex,
                fromCaseIndex: action.fromCaseIndex,
                toProjectIndex: action.toProjectIndex,
            });
            if (!result) return state;

            const { projects, adjustedToProjectIndex } = result;
            const activeCaseId = getActiveCaseId(
                state.projects,
                state.activeProjectIndex,
                state.activeCaseIndex,
            );
            const location = activeCaseId ? findCaseLocation(projects, activeCaseId) : null;

            const activeProjectIndex = location?.projectIndex ?? state.activeProjectIndex;
            const activeCaseIndex = location?.caseIndex ?? state.activeCaseIndex;
            const targetProject = projects[adjustedToProjectIndex];
            const validProjectIds = new Set(projects.map((project) => project.id));
            const expandedProjectIds = [
                ...new Set([
                    ...state.expandedProjectIds.filter((id) => validProjectIds.has(id)),
                    targetProject.id,
                ]),
            ];

            let openCaseIds = state.openCaseIds;
            if (result.removedSourceProject) {
                const removedCaseIds = collectProjectCaseIds(
                    state.projects,
                    action.fromProjectIndex,
                );
                openCaseIds = state.openCaseIds.filter(
                    (id) => !removedCaseIds.has(id) || id === result.movedCaseId,
                );
            }

            return withLoaded(state, {
                projects,
                activeProjectIndex,
                activeCaseIndex,
                expandedProjectIds,
                openCaseIds: sanitizeOpenCaseIds(
                    projects,
                    openCaseIds,
                    activeProjectIndex,
                    activeCaseIndex,
                ),
            });
        }

        case 'IMPORT_CASES': {
            const targetProject = state.projects[action.projectIndex];
            if (!targetProject || action.cases.length === 0) return state;

            const isPlaceholderOnly =
                targetProject.cases.length === 1 &&
                !targetProject.cases[0].address.trim() &&
                targetProject.cases[0].params.length === 0;

            const baseCases = isPlaceholderOnly ? [] : targetProject.cases;
            const nextCases = sortCasesByMsgtype([...baseCases, ...action.cases]);
            const firstImportedId = action.cases[0].id;

            const nextProjects = state.projects.map((project, index) =>
                index === action.projectIndex
                    ? { ...project, cases: nextCases, updatedAt: Date.now() }
                    : project,
            );

            return withLoaded(state, {
                projects: nextProjects,
                activeProjectIndex: action.projectIndex,
                activeCaseIndex: resolveCaseIndexById(nextCases, firstImportedId),
                expandedProjectIds: ensureExpanded(state, targetProject.id),
            });
        }
    }
}
