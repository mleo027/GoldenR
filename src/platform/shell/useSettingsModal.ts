import { useContext } from 'react';
import { SettingsModalContext } from './SettingsModalContext';

export function useSettingsModal() {
    const context = useContext(SettingsModalContext);
    if (!context) {
        throw new Error('useSettingsModal must be used within SettingsModalProvider');
    }
    return context;
}
