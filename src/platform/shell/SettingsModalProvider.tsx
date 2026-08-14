import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { SettingsModalContext } from './SettingsModalContext';

export function SettingsModalProvider({ children }: { children: ReactNode }) {
    const [open, setOpen] = useState(false);

    const openSettings = useCallback(() => setOpen(true), []);
    const closeSettings = useCallback(() => setOpen(false), []);

    const value = useMemo(
        () => ({ open, openSettings, closeSettings }),
        [closeSettings, open, openSettings],
    );

    return <SettingsModalContext.Provider value={value}>{children}</SettingsModalContext.Provider>;
}
