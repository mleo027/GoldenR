/**
 * 组装自动化能力的宿主上下文。
 *
 * 两条入口共用：
 * - **界面内**（Agent 面板）：传入已加载的环境与当前选中项，行为与迁移前一致；
 * - **外部调用**（MCP）：不传参数，自行 hydrate 并读取环境。
 *
 * 刻意**不依赖 React 挂载**：`useAutomationStore` 是 zustand 普通单例，环境经 service
 * 读取，运行走 `runScenarioForCapability`。因此即使模块界面从未打开过也能正确执行——
 * 但必须先把 store hydrate 起来，否则会拿到空工作区（而且是静默的）。
 */
import type { KcxpEnvironment } from '@/shared/kcxp/types';
import { loadAutomationEnvironments } from '../services/automationEnvironmentData';
import { runScenarioForCapability } from '../services/automationCapabilityRun';
import { useAutomationStore } from '../store/automationStore';
import type { AutomationCapabilityContext } from './handlers';

export interface AutomationContextOptions {
    /** 已加载的环境；省略时自行读取。 */
    environments?: KcxpEnvironment[];
    selectedScenarioId?: string;
    selectedEnvironmentId?: string;
}

/**
 * `loaded` 只在模块界面挂载时才被置位（见 AutomationLayout）。外部调用不能假定
 * 用户打开过界面，所以这里显式补齐——否则能力会静默地在空工作区上工作。
 */
async function ensureHydrated(): Promise<void> {
    const store = useAutomationStore.getState();
    if (!store.loaded) await store.load();
}

export async function createAutomationCapabilityContext(
    options: AutomationContextOptions = {},
): Promise<AutomationCapabilityContext> {
    await ensureHydrated();
    const state = useAutomationStore.getState();
    const environments = options.environments ?? (await loadAutomationEnvironments());
    return {
        workspace: state.workspace,
        reports: state.scenarioReports,
        environments,
        selectedScenarioId: options.selectedScenarioId,
        selectedEnvironmentId: options.selectedEnvironmentId,
        createScenario: (input) => useAutomationStore.getState().createScenario(input),
        updateScenario: (id, patch) => useAutomationStore.getState().updateScenario(id, patch),
        runScenario: runScenarioForCapability,
    };
}
