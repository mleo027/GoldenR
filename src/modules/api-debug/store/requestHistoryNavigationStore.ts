import { create } from 'zustand';
import type { SqlTraceResult } from '@/shared/kcbp/types';

export type RequestHistoryView = 'editor' | 'history' | 'history-detail' | 'trace';
type TraceReturnView = Exclude<RequestHistoryView, 'trace'>;

interface TraceReturnTarget {
    view: TraceReturnView;
    historyOpen: boolean;
    detailId?: string;
}

interface RequestHistoryNavigationStore {
    view: RequestHistoryView;
    historyOpen: boolean;
    detailId?: string;
    traceData: SqlTraceResult | null;
    traceCaseName: string;
    traceReturn: TraceReturnTarget | null;
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
    traceReturn: null,
    openHistory: () => set({ view: 'history', historyOpen: true }),
    closeHistory: () => set({ view: 'editor', historyOpen: false, detailId: undefined }),
    openHistoryDetail: (detailId) => set({ view: 'history-detail', historyOpen: true, detailId }),
    closeHistoryDetail: () => set({ view: 'history', detailId: undefined }),
    closeAllHistory: () => set({ view: 'editor', historyOpen: false, detailId: undefined }),
    showEditor: () => set({ view: 'editor', historyOpen: false, detailId: undefined }),
    openTrace: (traceData, traceCaseName) =>
        set((state) => ({
            view: 'trace',
            traceData,
            traceCaseName,
            traceReturn: {
                view: state.view === 'trace' ? 'editor' : state.view,
                historyOpen: state.historyOpen,
                detailId: state.detailId,
            },
        })),
    closeTrace: () =>
        set((state) => {
            const target = state.traceReturn ?? {
                view: 'editor' as const,
                historyOpen: false,
            };
            return {
                view: target.view,
                historyOpen: target.historyOpen,
                detailId: target.detailId,
                traceData: null,
                traceCaseName: '',
                traceReturn: null,
            };
        }),
}));
