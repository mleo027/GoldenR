import type { ReactNode } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import Card from '@/components/ui/primitives/Card';
import { MODULE_LAYOUT_SIDEBAR_RATIO } from '@/constants/ui';
import type { ModuleCardVariant } from './moduleCardVariant';
import { useModuleSidebarPanel } from './useModuleSidebarPanel';

export interface ModuleSidebarLayoutOptions {
    defaultSize?: number;
    minSize?: number;
    maxSize?: number;
    card?: ModuleCardVariant;
    padding?: boolean;
    className?: string;
}

export interface ModuleMainLayoutOptions {
    minSize?: number;
    card?: ModuleCardVariant;
    padding?: boolean;
    /** 主内容卡片额外 class */
    className?: string;
    /** 主 Panel 额外 class */
    panelClassName?: string;
}

export interface PlatformModuleLayoutProps {
    autoSaveId: string;
    sidebar: ReactNode;
    main: ReactNode;
    sidebarOptions?: ModuleSidebarLayoutOptions;
    mainOptions?: ModuleMainLayoutOptions;
    /** 模块级快捷键监听、Run 监听等 */
    listeners?: ReactNode;
    /** 命令面板等浮层 */
    overlays?: ReactNode;
    /** 加载完成前占位；默认 null */
    loadingFallback?: ReactNode;
    loaded?: boolean;
}

const DEFAULT_SIDEBAR: Required<
    Pick<ModuleSidebarLayoutOptions, 'defaultSize' | 'minSize' | 'maxSize' | 'card'>
> = {
    defaultSize: MODULE_LAYOUT_SIDEBAR_RATIO.defaultSize,
    minSize: MODULE_LAYOUT_SIDEBAR_RATIO.minSize,
    maxSize: MODULE_LAYOUT_SIDEBAR_RATIO.maxSize,
    card: 'sidebar',
};

const DEFAULT_MAIN: Required<Pick<ModuleMainLayoutOptions, 'minSize' | 'card'>> = {
    minSize: 42,
    card: 'workspace',
};

function wrapCard(
    variant: ModuleCardVariant,
    children: ReactNode,
    options?: { padding?: boolean; className?: string },
) {
    return (
        <Card variant={variant} padding={options?.padding} className={options?.className}>
            {children}
        </Card>
    );
}

export default function PlatformModuleLayout({
    autoSaveId,
    sidebar,
    main,
    sidebarOptions,
    mainOptions,
    listeners,
    overlays,
    loadingFallback = null,
    loaded = true,
}: PlatformModuleLayoutProps) {
    const { sidebarRef, sidebarCollapsed, onCollapse, onExpand } = useModuleSidebarPanel();

    const sidebarConfig = { ...DEFAULT_SIDEBAR, ...sidebarOptions };
    const mainConfig = { ...DEFAULT_MAIN, ...mainOptions };

    if (!loaded) {
        return loadingFallback;
    }

    return (
        <div className="platform-module-layout flex min-h-0 min-w-0 flex-1 flex-col">
            {listeners}
            <PanelGroup
                direction="horizontal"
                autoSaveId={autoSaveId}
                className={`platform-module-panels min-h-0 flex-1${sidebarCollapsed ? ' platform-module-panels--sidebar-collapsed' : ''}`}
            >
                <Panel
                    ref={sidebarRef}
                    defaultSize={sidebarConfig.defaultSize}
                    minSize={sidebarConfig.minSize}
                    maxSize={sidebarConfig.maxSize}
                    collapsible
                    collapsedSize={0}
                    onCollapse={onCollapse}
                    onExpand={onExpand}
                    className={
                        sidebarCollapsed
                            ? 'layout-panel layout-panel-sidebar-collapsed min-w-0'
                            : 'layout-panel layout-panel-sidebar min-w-0'
                    }
                >
                    {!sidebarCollapsed
                        ? wrapCard(sidebarConfig.card, sidebar, {
                              padding: sidebarOptions?.padding,
                              className: sidebarOptions?.className,
                          })
                        : null}
                </Panel>

                {!sidebarCollapsed ? <PanelResizeHandle className="case-sidebar-resize" /> : null}

                <Panel
                    minSize={mainConfig.minSize}
                    className={`layout-panel layout-panel-main min-w-0${mainOptions?.panelClassName ? ` ${mainOptions.panelClassName}` : ''}`}
                >
                    {wrapCard(mainConfig.card, main, {
                        padding: mainOptions?.padding,
                        className: mainOptions?.className,
                    })}
                </Panel>
            </PanelGroup>
            {overlays}
        </div>
    );
}
