/**
 * 应用根组件：AppEnv 加载完成后挂载 PlatformShell。
 * 按 activeModuleId 预加载当前模块及相邻模块（懒加载 chunk）。
 */
import { useEffect } from 'react';
import { AppEnvProvider } from './store/appEnvStore';
import AppThemeProvider from './components/theme/AppThemeProvider';
import PlatformShell from './platform/shell/PlatformShell';
import { BreadcrumbProvider } from './platform/shell/BreadcrumbProvider';
import { UndoRedoProvider } from './platform/undo';
import { APP_MODULES } from './platform/registry/modules';
import { preloadAppModule } from './platform/registry/lazyAppModule';
import { preloadAdjacentModule } from './platform/registry/preloadAdjacentModule';
import { useAppEnv } from './store/useAppEnv';

function AppContent() {
    const { loaded, env } = useAppEnv();

    useEffect(() => {
        if (!loaded) return;
        const activeModule = APP_MODULES.find((module) => module.id === env.activeModuleId);
        if (!activeModule) return;

        preloadAppModule(activeModule);
        const lazy = activeModule as typeof activeModule & {
            ensureLoaded?: () => Promise<unknown>;
        };
        void lazy.ensureLoaded?.().then(() => {
            preloadAdjacentModule(APP_MODULES, env.activeModuleId);
        });
    }, [loaded, env.activeModuleId]);

    if (!loaded) {
        return null;
    }

    return (
        <AppThemeProvider>
            <UndoRedoProvider>
                <BreadcrumbProvider>
                    <PlatformShell modules={APP_MODULES} />
                </BreadcrumbProvider>
            </UndoRedoProvider>
        </AppThemeProvider>
    );
}

function App() {
    return (
        <AppEnvProvider>
            <AppContent />
        </AppEnvProvider>
    );
}

export default App;
