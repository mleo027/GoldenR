import { useReducer, useCallback, useMemo, useEffect, useRef, type ReactNode } from 'react';
import type { TabData } from '../types/workspace';
import type { KcxpApplyScope, KcxpEnvironment } from '../types/kcxp';
import { TabsActionsContext, TabsStateContext, type TabsContextValue } from './TabsContext';
import { loadWorkspace, saveProjects, saveSettings, hashPersistedProjects } from './tabsData';
import { flushAllPersistedState } from '../../../lib/persistFlush';
import {
    buildAddressFromKcxpEnvironment,
    getActiveKcxpEnvironment,
} from '../utils/workspace/kcxpEnvironment';
import { useAppEnv } from '../../../store/useAppEnv';
import { useApiDebugEnv } from './useApiDebugEnv';
import { useUndoScope } from '@/platform/undo';
import { API_DEBUG_MODULE_ID } from '../constants/apiDebugEnv';
import { buildCaseUndoScopeId, createTabDataUndoCommand } from '../utils/workspace/tabUndo';

import { tabsReducer, createInitialTabsState } from './tabsReducer';
export type { TabsState } from './tabsReducer';

const initialState = createInitialTabsState();

export type { TabsContextValue };

export function TabsProvider({ children }: { children: ReactNode }) {
    const { env } = useAppEnv();
    const { env: apiEnv } = useApiDebugEnv();
    const [state, dispatch] = useReducer(tabsReducer, initialState);
    const workspaceRef = useRef(state);
    const lastSavedProjectsHashRef = useRef<string | null>(null);

    useEffect(() => {
        void loadWorkspace()
            .then((cached) => {
                if (cached) {
                    lastSavedProjectsHashRef.current = hashPersistedProjects(cached.projects);
                    dispatch({ type: 'SET_WORKSPACE', workspace: cached });
                } else {
                    dispatch({ type: 'MARK_LOADED' });
                }
            })
            .catch((error) => {
                console.error('Failed to load workspace:', error);
                lastSavedProjectsHashRef.current = hashPersistedProjects(
                    workspaceRef.current.projects,
                );
                dispatch({ type: 'MARK_LOADED' });
            });
    }, []);

    useEffect(() => {
        if (!state.loaded) return;

        const { projects, activeProjectIndex, activeCaseIndex, expandedProjectIds, openCaseIds } =
            state;
        const prev = workspaceRef.current;

        if (prev.projects !== projects && env.autoSave) {
            const hash = hashPersistedProjects(projects);
            if (hash !== lastSavedProjectsHashRef.current) {
                lastSavedProjectsHashRef.current = hash;
                saveProjects(projects);
            }
        }

        if (
            prev.activeProjectIndex !== activeProjectIndex ||
            prev.activeCaseIndex !== activeCaseIndex ||
            prev.expandedProjectIds !== expandedProjectIds ||
            prev.openCaseIds !== openCaseIds
        ) {
            saveSettings({
                activeProjectIndex,
                activeCaseIndex,
                expandedProjectIds,
                openCaseIds,
            });
        }

        workspaceRef.current = state;
    }, [state, env.autoSave]);

    useEffect(() => {
        const handleBeforeUnload = () => {
            void flushAllPersistedState().catch(console.error);
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    const activeProject = useMemo(
        () => state.projects[state.activeProjectIndex],
        [state.projects, state.activeProjectIndex],
    );

    const activeTab = useMemo(
        () => activeProject.cases[state.activeCaseIndex],
        [activeProject, state.activeCaseIndex],
    );

    const { push: pushUndo } = useUndoScope(buildCaseUndoScopeId(activeTab.id), {
        active: env.activeModuleId === API_DEBUG_MODULE_ID,
    });

    const applyTabPatch = useCallback(
        (updates: Partial<TabData>) => dispatch({ type: 'UPDATE_ACTIVE_CASE', updates }),
        [],
    );

    const getInitialAddress = useCallback(() => {
        const environment = getActiveKcxpEnvironment(
            apiEnv.kcxpEnvironments,
            apiEnv.activeKcxpEnvironmentId,
        );
        return buildAddressFromKcxpEnvironment(environment);
    }, [apiEnv.activeKcxpEnvironmentId, apiEnv.kcxpEnvironments]);

    const addProject = useCallback(
        () => dispatch({ type: 'ADD_PROJECT', initialAddress: getInitialAddress() }),
        [getInitialAddress],
    );
    const deleteProject = useCallback(
        (projectIndex: number) => dispatch({ type: 'DELETE_PROJECT', projectIndex }),
        [],
    );
    const renameProject = useCallback(
        (projectIndex: number, name: string) =>
            dispatch({ type: 'RENAME_PROJECT', projectIndex, name }),
        [],
    );
    const toggleProjectExpand = useCallback(
        (projectId: string) => dispatch({ type: 'TOGGLE_PROJECT_EXPAND', projectId }),
        [],
    );
    const addCase = useCallback(
        (projectIndex?: number) =>
            dispatch({ type: 'ADD_CASE', projectIndex, initialAddress: getInitialAddress() }),
        [getInitialAddress],
    );
    const duplicateCase = useCallback(
        (projectIndex: number, caseIndex: number) =>
            dispatch({ type: 'DUPLICATE_CASE', projectIndex, caseIndex }),
        [],
    );
    const deleteCase = useCallback(
        (projectIndex: number, caseIndex: number) =>
            dispatch({ type: 'DELETE_CASE', projectIndex, caseIndex }),
        [],
    );
    const selectCase = useCallback(
        (projectIndex: number, caseIndex: number) =>
            dispatch({ type: 'SELECT_CASE', projectIndex, caseIndex }),
        [],
    );
    const closeCaseTab = useCallback(
        (caseId: string) => dispatch({ type: 'CLOSE_CASE_TAB', caseId }),
        [],
    );
    const updateTab = useCallback(
        (updates: Partial<TabData>) => dispatch({ type: 'UPDATE_ACTIVE_CASE', updates }),
        [],
    );
    const updateTabUndoable = useCallback(
        (updates: Partial<TabData>, label?: string) => {
            const command = createTabDataUndoCommand({
                activeTab,
                updates,
                apply: applyTabPatch,
                label,
            });
            if (command) {
                pushUndo(command);
            }
            dispatch({ type: 'UPDATE_ACTIVE_CASE', updates });
        },
        [activeTab, applyTabPatch, pushUndo],
    );
    const renameCase = useCallback(
        (projectIndex: number, caseIndex: number, name: string) =>
            dispatch({ type: 'RENAME_CASE', projectIndex, caseIndex, name }),
        [],
    );
    const toggleCaseFavorite = useCallback(
        (projectIndex: number, caseIndex: number) =>
            dispatch({ type: 'TOGGLE_CASE_FAVORITE', projectIndex, caseIndex }),
        [],
    );
    const importCases = useCallback(
        (projectIndex: number, cases: TabData[]) =>
            dispatch({ type: 'IMPORT_CASES', projectIndex, cases }),
        [],
    );
    const moveCase = useCallback(
        (fromProjectIndex: number, fromCaseIndex: number, toProjectIndex: number) =>
            dispatch({ type: 'MOVE_CASE', fromProjectIndex, fromCaseIndex, toProjectIndex }),
        [],
    );
    const applyKcxpEnvironment = useCallback(
        (environment: KcxpEnvironment, scope: KcxpApplyScope) =>
            dispatch({ type: 'APPLY_KCXP_ENV', environment, scope }),
        [],
    );

    const actionsValue = useMemo(
        () => ({
            addProject,
            deleteProject,
            renameProject,
            toggleProjectExpand,
            addCase,
            duplicateCase,
            deleteCase,
            selectCase,
            closeCaseTab,
            updateTab,
            updateTabUndoable,
            renameCase,
            toggleCaseFavorite,
            importCases,
            moveCase,
            applyKcxpEnvironment,
        }),
        [
            addProject,
            deleteProject,
            renameProject,
            toggleProjectExpand,
            addCase,
            duplicateCase,
            deleteCase,
            selectCase,
            closeCaseTab,
            updateTab,
            updateTabUndoable,
            renameCase,
            toggleCaseFavorite,
            importCases,
            moveCase,
            applyKcxpEnvironment,
        ],
    );

    const stateValue = useMemo(
        () => ({
            state,
            activeProject,
            activeTab,
        }),
        [state, activeProject, activeTab],
    );

    return (
        <TabsActionsContext.Provider value={actionsValue}>
            <TabsStateContext.Provider value={stateValue}>{children}</TabsStateContext.Provider>
        </TabsActionsContext.Provider>
    );
}
