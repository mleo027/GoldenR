import { useContext } from 'react';
import { RequestHistoryNavigationContext } from './requestHistoryNavigationContext';

export function useRequestHistoryNavigation() {
    const context = useContext(RequestHistoryNavigationContext);
    if (!context) {
        throw new Error(
            'useRequestHistoryNavigation must be used within RequestHistoryNavigationProvider',
        );
    }
    return context;
}
