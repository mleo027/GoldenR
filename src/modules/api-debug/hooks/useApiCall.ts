import { useContext, useMemo } from 'react';
import { ApiCallContext, type ApiCallContextValue } from '../store/ApiCallContext';
import { useApiCallStore } from '../store/apiCallStore';
import { useActiveTab } from '../store/useTabs';

export function useApiCall(): ApiCallContextValue {
    const context = useContext(ApiCallContext);
    const { activeTab } = useActiveTab();
    const runningCaseId = useApiCallStore((state) => state.runningCaseId);
    const traceEnabled = useApiCallStore((state) => state.traceEnabled);
    const setTraceEnabled = useApiCallStore((state) => state.setTraceEnabled);
    if (!context) {
        throw new Error('useApiCall must be used within ApiCallProvider');
    }

    return useMemo(
        () => ({
            ...context,
            runningCaseId,
            loading: runningCaseId === activeTab.id,
            traceEnabled,
            setTraceEnabled,
        }),
        [activeTab.id, context, runningCaseId, setTraceEnabled, traceEnabled],
    );
}
