import type { TabsAction, TabsState } from './types';

export type ProjectMetadataAction = Extract<
    TabsAction,
    { type: 'RENAME_PROJECT' | 'TOGGLE_PROJECT_EXPAND' | 'SET_PROJECT_COMMON_PARAM_SET' }
>;

export function reduceProjectMetadataAction(
    state: TabsState,
    action: ProjectMetadataAction,
): TabsState {
    if (action.type === 'TOGGLE_PROJECT_EXPAND') {
        const expandedProjectIds = state.expandedProjectIds.includes(action.projectId)
            ? state.expandedProjectIds.filter((id) => id !== action.projectId)
            : [...state.expandedProjectIds, action.projectId];
        return { ...state, expandedProjectIds };
    }
    const project = state.projects[action.projectIndex];
    if (!project) return state;
    const updatedAt = Date.now();
    const projects = state.projects.map((item, index) => {
        if (index !== action.projectIndex) return item;
        if (action.type === 'RENAME_PROJECT') return { ...item, name: action.name, updatedAt };
        return {
            ...item,
            ...(action.setId === null
                ? { commonParamSetId: undefined }
                : { commonParamSetId: action.setId }),
            updatedAt,
        };
    });
    return { ...state, projects };
}
