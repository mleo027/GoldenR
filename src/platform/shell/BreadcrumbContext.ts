import { createContext } from 'react';

interface BreadcrumbContextValue {
    breadcrumb: string;
    setBreadcrumb: (value: string) => void;
}

export const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);
