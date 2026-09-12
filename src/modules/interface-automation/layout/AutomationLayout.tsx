import { useEffect, useRef, useState } from 'react';
import {
    Panel,
    PanelGroup,
    PanelResizeHandle,
    type ImperativePanelHandle,
} from 'react-resizable-panels';
import PlatformModuleLayout from '@/platform/shell/PlatformModuleLayout';
import ModuleLayoutSkeleton from '@/components/ui/ModuleLayoutSkeleton';
import AutomationSidebar from '../components/AutomationSidebar';
import AutomationWorkspace from '../components/AutomationWorkspace';
import AutomationAgentPanel from '../components/AutomationAgentPanel';
import { useAutomationStore } from '../store/automationStore';
import { AUTOMATION_WORKSPACE_CHANGED_EVENT } from '@/shared/automation/events';
import type { AutomationWorkspace as AutomationWorkspaceData } from '@/shared/automation/types';

const AGENT_PANEL_KEY = 'golden-interface-automation-agent-panel';

function readAgentPanelCollapsed(): boolean {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(AGENT_PANEL_KEY) === 'collapsed';
}

/**
 * 主区域 = 场景工作区 + 右侧 Agent 侧边栏。
 *
 * 右侧栏放在模块内部而不是 PlatformModuleLayout：
 * - 避免为一个模块的能力改动所有模块共用的壳层；
 * - 侧边栏天然只属于「接口自动化」。
 * 收起状态持久化到 localStorage，收起后由右侧浮动按钮重新展开。
 */
function AutomationMainWithAgent() {
    const [collapsed, setCollapsed] = useState(readAgentPanelCollapsed);
    const panelRef = useRef<ImperativePanelHandle>(null);

    useEffect(() => {
        window.localStorage.setItem(AGENT_PANEL_KEY, collapsed ? 'collapsed' : 'expanded');
    }, [collapsed]);

    useEffect(() => {
        const panel = panelRef.current;
        if (!panel) return;
        if (collapsed) panel.collapse();
        else panel.expand();
    }, [collapsed]);

    return (
        <div className="automation-main-split-wrap">
            <PanelGroup direction="horizontal" className="automation-main-split">
                <Panel defaultSize={72} minSize={45} className="min-w-0">
                    <AutomationWorkspace />
                </Panel>
                <PanelResizeHandle
                    className={`panel-resize-handle automation-agent-resize${collapsed ? ' is-collapsed' : ''}`}
                />
                <Panel
                    ref={panelRef}
                    defaultSize={28}
                    minSize={20}
                    maxSize={45}
                    collapsible
                    collapsedSize={0}
                    onCollapse={() => setCollapsed(true)}
                    onExpand={() => setCollapsed(false)}
                    className="min-w-0"
                >
                    <AutomationAgentPanel onCollapse={() => setCollapsed(true)} />
                </Panel>
            </PanelGroup>
            {collapsed ? (
                <button
                    type="button"
                    className="automation-agent-rail"
                    onClick={() => setCollapsed(false)}
                >
                    Agent
                </button>
            ) : null}
        </div>
    );
}

export default function AutomationLayout() {
    const loaded = useAutomationStore((state) => state.loaded);
    const load = useAutomationStore((state) => state.load);
    useEffect(() => {
        if (!loaded) void load();
    }, [load, loaded]);
    useEffect(() => {
        const receive = (event: Event) => {
            const workspace = (event as CustomEvent<AutomationWorkspaceData>).detail;
            if (workspace) useAutomationStore.getState().replaceWorkspace(workspace);
        };
        window.addEventListener(AUTOMATION_WORKSPACE_CHANGED_EVENT, receive);
        return () => window.removeEventListener(AUTOMATION_WORKSPACE_CHANGED_EVENT, receive);
    }, []);
    return (
        <PlatformModuleLayout
            autoSaveId="golden-interface-automation-layout"
            loaded={loaded}
            loadingFallback={<ModuleLayoutSkeleton />}
            sidebar={<AutomationSidebar />}
            main={<AutomationMainWithAgent />}
            sidebarOptions={{ defaultSize: 22, minSize: 16, maxSize: 36 }}
            mainOptions={{ card: 'none' }}
        />
    );
}
