import { useContext } from 'react';
import { RequestHistoryActionsContext, RequestHistoryStateContext } from './RequestHistoryContext';

export function useRequestHistoryState() {
    const context = useContext(RequestHistoryStateContext);
    if (!context) {
        throw new Error('useRequestHistoryState must be used within RequestHistoryProvider');
    }
    return context;
}

export function useRequestHistoryActions() {
    const context = useContext(RequestHistoryActionsContext);
    if (!context) {
        throw new Error('useRequestHistoryActions must be used within RequestHistoryProvider');
    }
    return context;
}
