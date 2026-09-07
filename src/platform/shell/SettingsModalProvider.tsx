import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { SettingsModalContext } from './SettingsModalContext';

export function SettingsModalProvider({ children }: { children: ReactNode }) {
    const [open, setOpen] = useState(false);
    const [initialSectionKey, setInitialSectionKey] = useState<string | undefined>();

    const openSettings = useCallback((sectionKey?: string) => {
        setInitialSectionKey(sectionKey);
        setOpen(true);
    }, []);
    const closeSettings = useCallback(() => setOpen(false), []);

    const value = useMemo(
        () => ({ open, initialSectionKey, openSettings, closeSettings }),
        [closeSettings, initialSectionKey, open, openSettings],
    );

    return <SettingsModalContext.Provider value={value}>{children}</SettingsModalContext.Provider>;
}
