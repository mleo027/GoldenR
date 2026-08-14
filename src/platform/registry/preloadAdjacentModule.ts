import type { AppModuleDefinition } from './types';

function scheduleIdleTask(task: () => void): void {
    if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(() => task(), { timeout: 2000 });
        return;
    }
    setTimeout(task, 2000);
}

/** 当前模块 load 完成后，idle 预加载 order 上的下一个模块 */
export function preloadAdjacentModule(
    modules: AppModuleDefinition[],
    activeModuleId: string,
): void {
    const index = modules.findIndex((module) => module.id === activeModuleId);
    if (index < 0) return;

    const next = modules[index + 1] ?? modules[0];
    if (!next || next.id === activeModuleId) return;

    const lazy = next as AppModuleDefinition & {
        ensureLoaded?: () => Promise<AppModuleDefinition>;
    };
    if (!lazy.ensureLoaded) return;

    scheduleIdleTask(() => {
        void lazy.ensureLoaded?.();
    });
}
