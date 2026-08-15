import { createContext } from 'react';
import type { RequestHistoryEntry } from '../types/requestHistory';

export interface RequestHistoryStateContextValue {
    entries: RequestHistoryEntry[];
    loaded: boolean;
}

export interface RequestHistoryActionsContextValue {
    addEntry: (entry: RequestHistoryEntry) => void;
    deleteEntry: (entryId: string) => void;
    clearHistory: () => void;
}

export const RequestHistoryStateContext = createContext<RequestHistoryStateContextValue | null>(
    null,
);

export const RequestHistoryActionsContext = createContext<RequestHistoryActionsContextValue | null>(
    null,
);
