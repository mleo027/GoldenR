import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { BreadcrumbContext } from './BreadcrumbContext';

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
    const [breadcrumb, setBreadcrumbState] = useState('');

    const setBreadcrumb = useCallback((value: string) => {
        setBreadcrumbState(value);
    }, []);

    const value = useMemo(
        () => ({
            breadcrumb,
            setBreadcrumb,
        }),
        [breadcrumb, setBreadcrumb],
    );

    return <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>;
}
