import { useMemo } from 'react';
import { useTabsStore } from './tabsZustand';
import { useShallow } from 'zustand/react/shallow';
import type { TabsState } from './tabsReducer';

export function useTabsState() {
    const state = useTabsStore(
        useShallow(
            (current): TabsState => ({
                projects: current.projects,
                activeProjectIndex: current.activeProjectIndex,
                activeCaseIndex: current.activeCaseIndex,
                expandedProjectIds: current.expandedProjectIds,
                openCaseIds: current.openCaseIds,
                loaded: current.loaded,
            }),
        ),
    );
    const activeProject = state.projects[state.activeProjectIndex];
    const activeTab = activeProject.cases[state.activeCaseIndex];
    return useMemo(() => ({ state, activeProject, activeTab }), [activeProject, activeTab, state]);
}

export function useTabsActions() {
    const storeActions = useTabsStore(
        useShallow((state) => ({
            addProject: state.addProject,
            deleteProject: state.deleteProject,
            addCase: state.addCase,
            renameProject: state.renameProject,
            toggleProjectExpand: state.toggleProjectExpand,
            setProjectCommonParamSet: state.setProjectCommonParamSet,
            addFolder: state.addFolder,
            renameFolder: state.renameFolder,
            deleteFolder: state.deleteFolder,
            moveCaseToFolder: state.moveCaseToFolder,
            duplicateCase: state.duplicateCase,
            deleteCase: state.deleteCase,
            selectCase: state.selectCase,
            closeCaseTab: state.closeCaseTab,
            updateTab: state.updateTab,
            updateCaseById: state.updateCaseById,
            renameCase: state.renameCase,
            toggleCaseFavorite: state.toggleCaseFavorite,
            importCases: state.importCases,
            moveCase: state.moveCase,
            updateTabUndoable: state.updateTabUndoable,
            applyKcxpEnvironment: state.applyKcxpEnvironment,
        })),
    );
    return storeActions;
}

export function useTabsNavigation() {
    return useTabsStore(
        useShallow((state) => ({
            projects: state.projects,
            activeProjectIndex: state.activeProjectIndex,
            activeCaseIndex: state.activeCaseIndex,
            expandedProjectIds: state.expandedProjectIds,
            openCaseIds: state.openCaseIds,
            loaded: state.loaded,
        })),
    );
}

/** 仅订阅当前选中项目/接口，避免无关 state 变更导致重渲染 */
export function useActiveTab() {
    const activeProject = useTabsStore((state) => state.projects[state.activeProjectIndex]);
    const activeTab = useTabsStore(
        (state) => state.projects[state.activeProjectIndex].cases[state.activeCaseIndex],
    );
    const activeCaseIndex = useTabsStore((state) => state.activeCaseIndex);
    return useMemo(
        () => ({
            activeProject,
            activeTab,
            activeCaseIndex,
        }),
        [activeProject, activeCaseIndex, activeTab],
    );
}
