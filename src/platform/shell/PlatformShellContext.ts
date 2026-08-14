import { createContext } from 'react';

export interface PlatformShellContextValue {
    sidebarVisible: boolean;
    setSidebarVisible: (visible: boolean) => void;
    toggleSidebar: () => void;
}

export const PlatformShellContext = createContext<PlatformShellContextValue | null>(null);
