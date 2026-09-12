import { useEffect } from 'react';
import PlatformModuleLayout from '@/platform/shell/PlatformModuleLayout';
import ModuleLayoutSkeleton from '@/components/ui/ModuleLayoutSkeleton';
import AutomationSidebar from '../components/AutomationSidebar';
import AutomationWorkspace from '../components/AutomationWorkspace';
import { useAutomationStore } from '../store/automationStore';
import { AUTOMATION_WORKSPACE_CHANGED_EVENT } from '@/shared/automation/events';
import type { AutomationWorkspace as AutomationWorkspaceData } from '@/shared/automation/types';

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
            main={<AutomationWorkspace />}
            sidebarOptions={{ defaultSize: 22, minSize: 16, maxSize: 36 }}
            mainOptions={{ card: 'none' }}
        />
    );
}
