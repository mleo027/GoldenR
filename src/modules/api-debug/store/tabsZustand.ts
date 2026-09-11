import { create } from 'zustand';
import {
    tabsReducer,
    createInitialTabsState,
    type TabsAction,
    type TabsState,
} from './tabsReducer';
import type { TabData } from '../types/workspace';
import type { KcxpEnvironment } from '../types/kcxp';
import { applyUndoable, getInitialAddress, getInitialProtocol } from './tabsActionRuntime';

export interface TabsZustandState extends TabsState {
    dispatch(action: TabsAction): void;
    reset(): void;
    renameProject(projectIndex: number, name: string): void;
    toggleProjectExpand(projectId: string): void;
    setProjectCommonParamSet(projectIndex: number, setId: string | null): void;
    addFolder(projectIndex: number, parentId?: string): void;
    renameFolder(projectIndex: number, folderId: string, name: string): void;
    deleteFolder(projectIndex: number, folderId: string): void;
    moveCaseToFolder(projectIndex: number, caseId: string, folderId?: string): void;
    duplicateCase(projectIndex: number, caseIndex: number): void;
    deleteCase(projectIndex: number, caseIndex: number): void;
    selectCase(projectIndex: number, caseIndex: number): void;
    closeCaseTab(caseId: string): void;
    updateTab(updates: Partial<TabData>): void;
    updateCaseById(caseId: string, updates: Partial<TabData>): void;
    renameCase(projectIndex: number, caseIndex: number, name: string): void;
    toggleCaseFavorite(projectIndex: number, caseIndex: number): void;
    importCases(projectIndex: number, cases: TabData[]): void;
    moveCase(fromProjectIndex: number, fromCaseIndex: number, toProjectIndex: number): void;
    addProject(): void;
    deleteProject(projectIndex: number): void;
    addCase(projectIndex?: number, folderId?: string): void;
    updateTabUndoable(updates: Partial<TabData>, label?: string): void;
    applyKcxpEnvironment(environment: KcxpEnvironment): void;
}

export const useTabsStore = create<TabsZustandState>((set, get) => {
    const dispatch = (action: TabsAction) =>
        set((state) => ({ ...tabsReducer(state, action), dispatch: state.dispatch }));
    const reset = () =>
        set({
            ...createInitialTabsState(),
            dispatch: get().dispatch,
            reset: get().reset,
        });
    return {
        ...createInitialTabsState(),
        dispatch,
        reset,
        renameProject: (projectIndex, name) =>
            dispatch({ type: 'RENAME_PROJECT', projectIndex, name }),
        toggleProjectExpand: (projectId) => dispatch({ type: 'TOGGLE_PROJECT_EXPAND', projectId }),
        setProjectCommonParamSet: (projectIndex, setId) =>
            dispatch({ type: 'SET_PROJECT_COMMON_PARAM_SET', projectIndex, setId }),
        addFolder: (projectIndex, parentId) =>
            dispatch({ type: 'ADD_FOLDER', projectIndex, parentId }),
        renameFolder: (projectIndex, folderId, name) =>
            dispatch({ type: 'RENAME_FOLDER', projectIndex, folderId, name }),
        deleteFolder: (projectIndex, folderId) =>
            dispatch({ type: 'DELETE_FOLDER', projectIndex, folderId }),
        moveCaseToFolder: (projectIndex, caseId, folderId) =>
            dispatch({ type: 'MOVE_CASE_TO_FOLDER', projectIndex, caseId, folderId }),
        duplicateCase: (projectIndex, caseIndex) =>
            dispatch({ type: 'DUPLICATE_CASE', projectIndex, caseIndex }),
        deleteCase: (projectIndex, caseIndex) =>
            dispatch({ type: 'DELETE_CASE', projectIndex, caseIndex }),
        selectCase: (projectIndex, caseIndex) =>
            dispatch({ type: 'SELECT_CASE', projectIndex, caseIndex }),
        closeCaseTab: (caseId) => dispatch({ type: 'CLOSE_CASE_TAB', caseId }),
        updateTab: (updates) => dispatch({ type: 'UPDATE_ACTIVE_CASE', updates }),
        updateCaseById: (caseId, updates) =>
            dispatch({ type: 'UPDATE_CASE_BY_ID', caseId, updates }),
        renameCase: (projectIndex, caseIndex, name) =>
            dispatch({ type: 'RENAME_CASE', projectIndex, caseIndex, name }),
        toggleCaseFavorite: (projectIndex, caseIndex) =>
            dispatch({ type: 'TOGGLE_CASE_FAVORITE', projectIndex, caseIndex }),
        importCases: (projectIndex, cases) =>
            dispatch({ type: 'IMPORT_CASES', projectIndex, cases }),
        moveCase: (fromProjectIndex, fromCaseIndex, toProjectIndex) =>
            dispatch({ type: 'MOVE_CASE', fromProjectIndex, fromCaseIndex, toProjectIndex }),
        addProject: () =>
            dispatch({
                type: 'ADD_PROJECT',
                initialAddress: getInitialAddress(),
                initialProtocol: getInitialProtocol(),
            }),
        deleteProject: (projectIndex) => dispatch({ type: 'DELETE_PROJECT', projectIndex }),
        addCase: (projectIndex, folderId) =>
            dispatch({
                type: 'ADD_CASE',
                projectIndex,
                folderId,
                initialAddress: getInitialAddress(),
                initialProtocol: getInitialProtocol(),
            }),
        updateTabUndoable: (updates, label) => applyUndoable(updates, label),
        applyKcxpEnvironment: (environment) => dispatch({ type: 'APPLY_KCXP_ENV', environment }),
    };
});
