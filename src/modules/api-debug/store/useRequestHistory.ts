import { useRequestHistoryStore } from './requestHistoryStore';
import { useShallow } from 'zustand/react/shallow';

export function useRequestHistoryState() {
    return useRequestHistoryStore(useShallow(({ entries, loaded }) => ({ entries, loaded })));
}

export function useRequestHistoryActions() {
    return useRequestHistoryStore(
        useShallow(({ addEntry, deleteEntry, clearHistory }) => ({
            addEntry,
            deleteEntry,
            clearHistory,
        })),
    );
}
