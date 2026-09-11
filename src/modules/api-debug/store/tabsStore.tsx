/* dispatch is the stable Zustand action; it intentionally does not participate in React deps. */
/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useMemo, type ReactNode } from 'react';
import type { TabData } from '../types/workspace';
import {
    buildAddressFromKcxpEnvironment,
    getActiveKcxpEnvironment,
    resolveKcxpProtocol,
} from '../utils/workspace/kcxpEnvironment';
import { useAppEnv } from '../../../store/useAppEnv';
import { useApiDebugEnv } from './useApiDebugEnv';
import { useUndoScope } from '@/platform/undo';
import { API_DEBUG_MODULE_ID } from '../constants/apiDebugEnv';
import { buildCaseUndoScopeId, createTabDataUndoCommand } from '../utils/workspace/tabUndo';

import { useTabsStore } from './tabsZustand';
import { configureTabsActionRuntime } from './tabsActionRuntime';
import { useWorkspacePersistence } from './useWorkspacePersistence';
export type { TabsState } from './tabsReducer';

export function TabsProvider({ children }: { children: ReactNode }) {
    const { env } = useAppEnv();
    const { env: apiEnv, loaded: apiEnvLoaded } = useApiDebugEnv();
    const state = useTabsStore();
    const dispatch = useTabsStore.getState().dispatch;
    const reset = useTabsStore((current) => current.reset);
    useEffect(() => reset(), [reset]);
    useWorkspacePersistence({ state, dispatch, autoSave: env.autoSave, apiEnv, apiEnvLoaded });

    // 启动引导：workspace 与环境配置都加载完成后，将当前激活 KCXP 环境
    // 应用到全部接口一次，消除持久化快照与激活环境的脱节（仅执行一次）
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

    // 新建接口/项目时同步激活环境的协议，避免出现“KGBP 地址 + KCBP 协议”的错配
    const getInitialProtocol = useCallback(
        () =>
            resolveKcxpProtocol(
                getActiveKcxpEnvironment(apiEnv.kcxpEnvironments, apiEnv.activeKcxpEnvironmentId),
            ),
        [apiEnv.activeKcxpEnvironmentId, apiEnv.kcxpEnvironments],
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

    useEffect(() => {
        return configureTabsActionRuntime({
            getInitialAddress,
            getInitialProtocol,
            applyUndoable: updateTabUndoable,
        });
    }, [getInitialAddress, getInitialProtocol, updateTabUndoable]);

    return children;
}
