import { useContext, useMemo } from 'react';
import { TabsActionsContext, TabsStateContext } from './TabsContext';

export function useTabsState() {
    const context = useContext(TabsStateContext);
    if (!context) {
        throw new Error('useTabsState must be used within a TabsProvider');
    }
    return context;
}

export function useTabsActions() {
    const context = useContext(TabsActionsContext);
    if (!context) {
        throw new Error('useTabsActions must be used within a TabsProvider');
    }
    return context;
}

export function useTabsNavigation() {
    const { state } = useTabsState();
    return useMemo(
        () => ({
            projects: state.projects,
            activeProjectIndex: state.activeProjectIndex,
            activeCaseIndex: state.activeCaseIndex,
            expandedProjectIds: state.expandedProjectIds,
            openCaseIds: state.openCaseIds,
            loaded: state.loaded,
        }),
        [
            state.projects,
            state.activeProjectIndex,
            state.activeCaseIndex,
            state.expandedProjectIds,
            state.openCaseIds,
            state.loaded,
        ],
    );
}

/** 仅订阅当前选中项目/接口，避免无关 state 变更导致重渲染 */
export function useActiveTab() {
    const { activeProject, activeTab, state } = useTabsState();
    return useMemo(
        () => ({
            activeProject,
            activeTab,
            activeCaseIndex: state.activeCaseIndex,
        }),
        [activeProject, activeTab, state.activeCaseIndex],
    );
}
