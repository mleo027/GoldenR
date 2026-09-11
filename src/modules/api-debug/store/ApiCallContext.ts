import { createContext } from 'react';

export interface ApiCallContextValue {
    runningCaseId: string | null;
    loading: boolean;
    run: () => Promise<void>;
    cancel: () => void;
    traceEnabled: boolean;
    setTraceEnabled: (enabled: boolean) => void;
}

export interface ApiCallStoreValue {
    run: () => Promise<void>;
    cancel: () => void;
}

export const ApiCallContext = createContext<ApiCallStoreValue | null>(null);
