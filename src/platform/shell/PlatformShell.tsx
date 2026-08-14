/** 平台壳：ActivityBar 模块切换 + ModuleHost 懒加载 + 命令面板 */
import { useCallback, useMemo, useState } from 'react';
import { useBreadcrumb } from './useBreadcrumb';
import ActivityBar from './ActivityBar';
import ModuleHost from './ModuleHost';
import TitleBar from '../../components/layout/TitleBar';
import { SettingsModalProvider } from './SettingsModalProvider';
import PlatformCommandPalette from './PlatformCommandPalette';
import { useActiveModule } from './useActiveModule';
import type { AppModuleDefinition } from '../registry/types';
import { useAppEnv } from '../../store/useAppEnv';
import { PlatformShellContext } from './PlatformShellContext';
import ModuleShortcut from './ModuleShortcut';
import { PLATFORM_SHORTCUT } from './platformShortcuts';
import { useSettingsModal } from './useSettingsModal';
import { UndoRedoHost } from '../undo';

interface PlatformShellProps {
    modules: AppModuleDefinition[];
}

function PlatformSettingsShortcut() {
    const { openSettings } = useSettingsModal();
    return <ModuleShortcut {...PLATFORM_SHORTCUT.OPEN_SETTINGS} handler={openSettings} />;
}

function PlatformCommandPaletteShortcut({ onOpen }: { onOpen: () => void }) {
    return <ModuleShortcut {...PLATFORM_SHORTCUT.COMMAND_PALETTE} handler={onOpen} />;
}

export default function PlatformShell({ modules }: PlatformShellProps) {
    const { env, updateEnv } = useAppEnv();
    const { breadcrumb } = useBreadcrumb();
    const activeModule = useActiveModule(modules);
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

    const setSidebarVisible = useCallback(
        (visible: boolean) => {
            updateEnv('sidebarVisible', visible);
        },
        [updateEnv],
    );

    const toggleSidebar = useCallback(() => {
        updateEnv('sidebarVisible', !env.sidebarVisible);
    }, [env.sidebarVisible, updateEnv]);

    const openCommandPalette = useCallback(() => {
        setCommandPaletteOpen(true);
    }, []);

    const closeCommandPalette = useCallback(() => {
        setCommandPaletteOpen(false);
    }, []);

    const shellValue = useMemo(
        () => ({
            sidebarVisible: env.sidebarVisible,
            setSidebarVisible,
            toggleSidebar,
        }),
        [env.sidebarVisible, setSidebarVisible, toggleSidebar],
    );

    return (
        <PlatformShellContext.Provider value={shellValue}>
            <SettingsModalProvider>
                <PlatformSettingsShortcut />
                <PlatformCommandPaletteShortcut onOpen={openCommandPalette} />
                <UndoRedoHost />
                <div
                    className={`platform-shell flex h-screen w-screen overflow-hidden bg-[var(--color-bg-page)]${env.compactMode ? ' app-compact' : ''}`}
                >
                    <ActivityBar modules={modules} onOpenCommandPalette={openCommandPalette} />
                    <div className="platform-shell-main flex h-full min-h-0 min-w-0 flex-1 flex-col">
                        <TitleBar
                            moduleLabel={activeModule?.label ?? ''}
                            breadcrumb={breadcrumb}
                            useTitleBarSlot={Boolean(activeModule?.TitleBarSlot)}
                        />
                        <ModuleHost modules={modules} />
                    </div>
                </div>
                <PlatformCommandPalette
                    open={commandPaletteOpen}
                    onClose={closeCommandPalette}
                    modules={modules}
                />
            </SettingsModalProvider>
        </PlatformShellContext.Provider>
    );
}
