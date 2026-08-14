import { useContext, useMemo } from 'react';
import { KcbpCallContext, type KcbpCallContextValue } from '../store/KcbpCallContext';
import { useActiveTab } from '../store/useTabs';

export function useKcbpCall(): KcbpCallContextValue {
    const context = useContext(KcbpCallContext);
    const { activeTab } = useActiveTab();
    if (!context) {
        throw new Error('useKcbpCall must be used within KcbpCallProvider');
    }

    return useMemo(
        () => ({
            ...context,
            loading: context.runningCaseId === activeTab.id,
        }),
        [activeTab.id, context],
    );
}
