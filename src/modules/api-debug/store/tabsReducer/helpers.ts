import type { PersistedWorkspace } from '../../types/workspace';
import { normalizeWorkspace } from '../tabsData';
import type { TabsState } from './types';

export function ensureExpanded(state: TabsState, projectId: string): string[] {
    return state.expandedProjectIds.includes(projectId)
        ? state.expandedProjectIds
        : [...state.expandedProjectIds, projectId];
}

export function withLoaded(
    state: TabsState,
    workspace: Omit<PersistedWorkspace, 'openCaseIds'> & { openCaseIds?: string[] },
): TabsState {
    return {
        ...normalizeWorkspace({
            ...workspace,
            openCaseIds: workspace.openCaseIds ?? state.openCaseIds,
        }),
        loaded: state.loaded,
    };
}
