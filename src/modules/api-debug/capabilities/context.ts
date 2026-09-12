/**
 * 组装 API 调试能力的宿主上下文。
 *
 * 刻意**不依赖 React 挂载**：`useTabsStore` / `useRequestHistoryStore` 都是 zustand
 * 普通单例，`loadWorkspace()` 是普通 service。因此外部调用（MCP）即使发生在模块界面
 * 从未打开时也能正确执行——但必须先把 store hydrate 起来，否则会在**空工作区上静默
 * 工作**（tabs 的 `loaded` 只由挂载时的 useWorkspacePersistence 置位）。
 *
 * 已知限制：不套用 KCXP 环境改写地址。外部调用方没有"当前环境"这个概念，因此地址按
 * 用例原样使用；若用例地址依赖环境替换，请在用例里写完整地址。
 */
import { executeApiCase } from '../services/kcbp/executeCase';
import { useRequestHistoryStore } from '../store/requestHistoryStore';
import { loadWorkspace } from '../store/tabsData';
import { useTabsStore } from '../store/tabsZustand';
import type { ApiDebugCapabilityContext } from './handlers';

async function ensureProjectHydrated(): Promise<void> {
    const store = useTabsStore.getState();
    if (store.loaded) return;
    const workspace = await loadWorkspace();
    store.dispatch(workspace ? { type: 'SET_WORKSPACE', workspace } : { type: 'MARK_LOADED' });
}

export async function createApiDebugCapabilityContext(): Promise<ApiDebugCapabilityContext> {
    await ensureProjectHydrated();
    const history = useRequestHistoryStore.getState();
    if (!history.loaded) await history.load();

    return {
        projects: useTabsStore.getState().projects,
        history: useRequestHistoryStore.getState().entries,
        importCase: (projectIndex, tab) => useTabsStore.getState().importCases(projectIndex, [tab]),
        updateCaseById: (caseId, patch) => useTabsStore.getState().updateCaseById(caseId, patch),
        executeCase: (tab, mode) => executeApiCase(tab, mode, {}),
        newCaseId: () => crypto.randomUUID(),
    };
}
