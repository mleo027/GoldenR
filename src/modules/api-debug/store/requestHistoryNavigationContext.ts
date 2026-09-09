import { createContext } from 'react';
import type { SqlTraceResult } from '@/shared/kcbp/types';

export type RequestHistoryView = 'editor' | 'history' | 'history-detail' | 'trace';

export interface RequestHistoryNavigationContextValue {
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

export const RequestHistoryNavigationContext =
    createContext<RequestHistoryNavigationContextValue | null>(null);
