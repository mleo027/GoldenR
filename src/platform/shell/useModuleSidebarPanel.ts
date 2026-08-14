import { useCallback, useEffect, useRef, type RefObject } from 'react';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import { usePlatformShell } from './usePlatformShell';

export function useModuleSidebarPanel() {
    const { sidebarVisible, setSidebarVisible } = usePlatformShell();
    const sidebarRef = useRef<ImperativePanelHandle>(null);
    const sidebarCollapsed = !sidebarVisible;

    useEffect(() => {
        const panel = sidebarRef.current;
        if (!panel) return;

        if (!sidebarVisible && !panel.isCollapsed()) {
            panel.collapse();
        } else if (sidebarVisible && panel.isCollapsed()) {
            panel.expand();
        }
    }, [sidebarVisible]);

    const onCollapse = useCallback(() => {
        setSidebarVisible(false);
    }, [setSidebarVisible]);

    const onExpand = useCallback(() => {
        setSidebarVisible(true);
    }, [setSidebarVisible]);

    return {
        sidebarRef: sidebarRef as RefObject<ImperativePanelHandle>,
        sidebarCollapsed,
        onCollapse,
        onExpand,
    };
}
