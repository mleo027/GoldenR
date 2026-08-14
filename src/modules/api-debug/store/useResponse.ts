import { useContext, useMemo } from 'react';
import { ResponseActionsContext, ResponseStateContext } from './ResponseContext';

export function useResponseState() {
    const context = useContext(ResponseStateContext);
    if (!context) {
        throw new Error('useResponseState must be used within ResponseProvider');
    }
    return context;
}

export function useResponseActions() {
    const context = useContext(ResponseActionsContext);
    if (!context) {
        throw new Error('useResponseActions must be used within ResponseProvider');
    }
    return context;
}

export function useResponse(caseId: string) {
    const { responses } = useResponseState();
    return useMemo(() => responses[caseId], [responses, caseId]);
}
