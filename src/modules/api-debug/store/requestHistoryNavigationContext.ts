import { createContext } from 'react';

export type RequestHistoryView = 'editor' | 'history' | 'history-detail';

export interface RequestHistoryNavigationContextValue {
    view: RequestHistoryView;
    historyOpen: boolean;
    detailId?: string;
    openHistory: () => void;
    closeHistory: () => void;
    openHistoryDetail: (entryId: string) => void;
    closeHistoryDetail: () => void;
    closeAllHistory: () => void;
    showEditor: () => void;
}

export const RequestHistoryNavigationContext =
    createContext<RequestHistoryNavigationContextValue | null>(null);
