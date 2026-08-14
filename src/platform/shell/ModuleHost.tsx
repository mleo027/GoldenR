/** 按 activeModuleId 懒加载并挂载当前子应用的 Provider + Layout + 面包屑同步 */
import { useCallback, useEffect, useState } from 'react';
import { useAppEnv } from '../../store/useAppEnv';
import type { AppModuleDefinition } from '../registry/types';
import SettingsModalGate from './SettingsModalGate';
import TitleBarSlotPortal from './TitleBarSlotPortal';
import { useActiveModule } from './useActiveModule';

interface ModuleHostProps {
    modules: AppModuleDefinition[];
}

function ModuleInstance({
    module,
    active,
    visited,
}: {
    module: AppModuleDefinition;
    active: boolean;
    visited: boolean;
}) {
    if (!visited) return null;

    const { RootProviders, Layout, BreadcrumbSync, TitleBarSlot, StatusBar } = module;

    return (
        <div
            className={`module-host-panel${active ? ' module-host-panel-active' : ''}`}
            aria-hidden={!active}
        >
            <RootProviders>
                <div className="module-instance flex flex-col flex-1 min-h-0 min-w-0">
                    {active && BreadcrumbSync ? <BreadcrumbSync /> : null}
                    {active && TitleBarSlot ? (
                        <TitleBarSlotPortal>
                            <TitleBarSlot />
                        </TitleBarSlotPortal>
                    ) : null}
                    <Layout />
                    {active && StatusBar ? <StatusBar /> : null}
                </div>
                {/*
                 * SettingsModalGate 必须在当前激活模块的 RootProviders 子树内，
                 * 以便模块设置面板复用同一 Context（如 useParamSuggest）。
                 * StatusBar 同理（如 ApiDebugStatusBar 依赖 RunLogProvider）。
                 */}
                {active ? <SettingsModalGate /> : null}
            </RootProviders>
        </div>
    );
}

export default function ModuleHost({ modules }: ModuleHostProps) {
    const { env } = useAppEnv();
    const activeModule = useActiveModule(modules);
    const [visitedModules, setVisitedModules] = useState<Set<string>>(
        () => new Set([env.activeModuleId]),
    );

    useEffect(() => {
        setVisitedModules((prev) => {
            if (prev.has(env.activeModuleId)) return prev;
            const next = new Set(prev);
            next.add(env.activeModuleId);
            return next;
        });
    }, [env.activeModuleId]);

    const renderModule = useCallback(
        (module: AppModuleDefinition) => (
            <ModuleInstance
                key={module.id}
                module={module}
                active={module.id === activeModule?.id}
                visited={visitedModules.has(module.id)}
            />
        ),
        [activeModule?.id, visitedModules],
    );

    return (
        <div className="module-host flex flex-1 min-h-0 min-w-0">{modules.map(renderModule)}</div>
    );
}
