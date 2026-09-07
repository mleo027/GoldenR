import { createContext } from 'react';

export interface SettingsModalContextValue {
    open: boolean;
    initialSectionKey?: string;
    openSettings: (sectionKey?: string) => void;
    closeSettings: () => void;
}

export const SettingsModalContext = createContext<SettingsModalContextValue | null>(null);
