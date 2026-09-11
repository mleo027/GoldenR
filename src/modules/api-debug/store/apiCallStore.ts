import { create } from 'zustand';

export interface ApiCallState {
    runningCaseId: string | null;
    traceEnabled: boolean;
    setRunningCaseId: (caseId: string | null) => void;
    setTraceEnabled: (enabled: boolean) => void;
}

export const useApiCallStore = create<ApiCallState>((set) => ({
    runningCaseId: null,
    traceEnabled: false,
    setRunningCaseId: (runningCaseId) => set({ runningCaseId }),
    setTraceEnabled: (traceEnabled) => set({ traceEnabled }),
}));
