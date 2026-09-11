import { useCallback, useEffect, useRef } from 'react';
import type { ApiDebugEnv } from '../types';
import type { TabsAction, TabsState } from './tabsReducer';
import {
    applyTabDraftsToWorkspace,
    flushPendingSavesAsync,
    hashPersistedProjects,
    loadWorkspace,
    saveProjects,
    saveSettings,
} from './tabsData';
import { flushAllPersistedState } from '../../../lib/persistFlush';
import { flushAllTabDrafts } from '../utils/workspace/tabDraftRegistry';
import { registerWorkspaceDraftFlusher } from './workspaceFlushRegistry';
import { getActiveKcxpEnvironment } from '../utils/workspace/kcxpEnvironment';

interface Options {
    state: TabsState;
    dispatch: (action: TabsAction) => void;
    autoSave: boolean;
    apiEnv: ApiDebugEnv;
    apiEnvLoaded: boolean;
}

function useBeforeUnloadFlush(): void {
    useEffect(() => {
        const beforeUnload = () => void flushAllPersistedState().catch(console.error);
        window.addEventListener('beforeunload', beforeUnload);
        return () => window.removeEventListener('beforeunload', beforeUnload);
    }, []);
}

export function useWorkspacePersistence({
    state,
    dispatch,
    autoSave,
    apiEnv,
    apiEnvLoaded,
}: Options): void {
    const workspaceRef = useRef(state);
    const latestWorkspaceRef = useRef(state);
    const savedHashRef = useRef<string | null>(null);
    const bootstrappedRef = useRef(false);
    latestWorkspaceRef.current = state;

    useEffect(() => {
        if (bootstrappedRef.current || !state.loaded || !apiEnvLoaded) return;
        bootstrappedRef.current = true;
        dispatch({
            type: 'APPLY_KCXP_ENV',
            environment: getActiveKcxpEnvironment(
                apiEnv.kcxpEnvironments,
                apiEnv.activeKcxpEnvironmentId,
            ),
        });
    }, [
        apiEnv.activeKcxpEnvironmentId,
        apiEnv.kcxpEnvironments,
        apiEnvLoaded,
        dispatch,
        state.loaded,
    ]);

    useEffect(() => {
        void loadWorkspace()
            .then((workspace) => {
                if (workspace) {
                    savedHashRef.current = hashPersistedProjects(workspace.projects);
                    dispatch({ type: 'SET_WORKSPACE', workspace });
                } else dispatch({ type: 'MARK_LOADED' });
            })
            .catch((error) => {
                console.error('Failed to load workspace:', error);
                savedHashRef.current = hashPersistedProjects(workspaceRef.current.projects);
                dispatch({ type: 'MARK_LOADED' });
            });
    }, [dispatch]);

    useEffect(() => {
        if (!state.loaded) return;
        const previous = workspaceRef.current;
        if (previous.projects !== state.projects && autoSave) {
            const hash = hashPersistedProjects(state.projects);
            if (hash !== savedHashRef.current) {
                savedHashRef.current = hash;
                saveProjects(state.projects);
            }
        }
        if (
            previous.activeProjectIndex !== state.activeProjectIndex ||
            previous.activeCaseIndex !== state.activeCaseIndex ||
            previous.expandedProjectIds !== state.expandedProjectIds ||
            previous.openCaseIds !== state.openCaseIds
        ) {
            saveSettings({
                activeProjectIndex: state.activeProjectIndex,
                activeCaseIndex: state.activeCaseIndex,
                expandedProjectIds: state.expandedProjectIds,
                openCaseIds: state.openCaseIds,
            });
        }
        workspaceRef.current = state;
    }, [autoSave, state]);

    const flush = useCallback(async () => {
        const errors: unknown[] = [];
        let drafts: ReturnType<typeof flushAllTabDrafts> = {};
        try {
            drafts = flushAllTabDrafts();
        } catch (error) {
            errors.push(error);
        }

        try {
            const workspace = latestWorkspaceRef.current;
            if (workspace.loaded && autoSave) {
                const next = applyTabDraftsToWorkspace(workspace, drafts);
                if (
                    hashPersistedProjects(next.projects) !==
                    hashPersistedProjects(workspace.projects)
                ) {
                    saveProjects(next.projects);
                }
            }
            await flushPendingSavesAsync();
        } catch (error) {
            errors.push(error);
        }

        if (errors.length > 0) {
            throw new Error(`Workspace flush failed: ${errors.map(String).join('; ')}`);
        }
    }, [autoSave]);

    useEffect(() => registerWorkspaceDraftFlusher(flush), [flush]);
    useBeforeUnloadFlush();
}
