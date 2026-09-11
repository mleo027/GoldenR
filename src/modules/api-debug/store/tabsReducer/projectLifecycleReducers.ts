import { createEmptyProject } from '../../constants/workspace';
import { collectProjectCaseIds, sanitizeOpenCaseIds } from '../../utils/workspace/openCaseTabs';
import { withLoaded } from './helpers';
import type { TabsAction, TabsState } from './types';

export type ProjectLifecycleAction = Extract<
    TabsAction,
    { type: 'ADD_PROJECT' | 'DELETE_PROJECT' }
>;

function addProject(
    state: TabsState,
    action: Extract<ProjectLifecycleAction, { type: 'ADD_PROJECT' }>,
): TabsState {
    const project = createEmptyProject(state.projects.length + 1);
    if (action.initialAddress && project.cases[0]) {
        project.cases[0] = {
            ...project.cases[0],
            address: action.initialAddress,
            ...(action.initialProtocol ? { protocol: action.initialProtocol } : {}),
        };
    }
    return withLoaded(state, {
        projects: [...state.projects, project],
        activeProjectIndex: state.projects.length,
        activeCaseIndex: 0,
        expandedProjectIds: [...state.expandedProjectIds, project.id],
    });
}

function deleteProject(state: TabsState, projectIndex: number): TabsState {
    const projects = state.projects.filter((_, index) => index !== projectIndex);
    if (projects.length === 0) {
        const project = createEmptyProject(1);
        return withLoaded(state, {
            projects: [project],
            activeProjectIndex: 0,
            activeCaseIndex: 0,
            expandedProjectIds: [project.id],
        });
    }
    let activeProjectIndex = state.activeProjectIndex;
    if (projectIndex < activeProjectIndex) activeProjectIndex--;
    else if (projectIndex === activeProjectIndex) {
        activeProjectIndex = Math.min(projectIndex, projects.length - 1);
    }
    const activeCaseIndex = Math.min(
        state.activeCaseIndex,
        projects[activeProjectIndex].cases.length - 1,
    );
    const removedCaseIds = collectProjectCaseIds(state.projects, projectIndex);
    return withLoaded(state, {
        projects,
        activeProjectIndex,
        activeCaseIndex,
        expandedProjectIds: state.expandedProjectIds.filter((id) =>
            projects.some((project) => project.id === id),
        ),
        openCaseIds: sanitizeOpenCaseIds(
            projects,
            state.openCaseIds.filter((id) => !removedCaseIds.has(id)),
            activeProjectIndex,
            activeCaseIndex,
        ),
    });
}

export function reduceProjectLifecycleAction(
    state: TabsState,
    action: ProjectLifecycleAction,
): TabsState {
    return action.type === 'ADD_PROJECT'
        ? addProject(state, action)
        : deleteProject(state, action.projectIndex);
}
