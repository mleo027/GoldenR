import { createContext } from 'react';

export interface SettingsModalContextValue {
    open: boolean;
    openSettings: () => void;
    closeSettings: () => void;
}

export const SettingsModalContext = createContext<SettingsModalContextValue | null>(null);
