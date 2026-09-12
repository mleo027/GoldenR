import { create } from 'zustand';
import type { SqlTraceResult } from '@/shared/kcbp/types';

export type RequestHistoryView = 'editor' | 'history' | 'history-detail' | 'trace';

interface RequestHistoryNavigationStore {
    view: RequestHistoryView;
    historyOpen: boolean;
    detailId?: string;
    traceData: SqlTraceResult | null;
    traceCaseName: string;
    openHistory: () => void;
    closeHistory: () => void;
    openHistoryDetail: (entryId: string) => void;
    closeHistoryDetail: () => void;
    closeAllHistory: () => void;
    showEditor: () => void;
    openTrace: (data: SqlTraceResult, caseName: string) => void;
    closeTrace: () => void;
}

export const useRequestHistoryNavigationStore = create<RequestHistoryNavigationStore>((set) => ({
    view: 'editor',
    historyOpen: false,
    traceData: null,
    traceCaseName: '',
    openHistory: () => set({ view: 'history', historyOpen: true }),
    closeHistory: () => set({ view: 'editor', historyOpen: false, detailId: undefined }),
    openHistoryDetail: (detailId) => set({ view: 'history-detail', historyOpen: true, detailId }),
    closeHistoryDetail: () => set({ view: 'history', detailId: undefined }),
    closeAllHistory: () => set({ view: 'editor', historyOpen: false, detailId: undefined }),
    showEditor: () => set({ view: 'editor', historyOpen: false, detailId: undefined }),
    openTrace: (traceData, traceCaseName) => set({ view: 'trace', traceData, traceCaseName }),
    closeTrace: () => set({ view: 'history-detail', traceData: null, traceCaseName: '' }),
}));
