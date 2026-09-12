import { create } from 'zustand';
import type { RequestHistoryEntry } from '../types/requestHistory';
import { loadRequestHistory, MAX_REQUEST_HISTORY, saveRequestHistory } from './requestHistoryData';

interface RequestHistoryStore {
    entries: RequestHistoryEntry[];
    loaded: boolean;
    load: () => Promise<void>;
    addEntry: (entry: RequestHistoryEntry) => void;
    deleteEntry: (entryId: string) => void;
    clearHistory: () => void;
}

let loadPromise: Promise<void> | null = null;

export const useRequestHistoryStore = create<RequestHistoryStore>((set, get) => {
    const update = (entries: RequestHistoryEntry[], persist: boolean) => {
        const next = entries.slice(0, MAX_REQUEST_HISTORY);
        set({ entries: next });
        if (persist && get().loaded) saveRequestHistory(next);
    };

    return {
        entries: [],
        loaded: false,
        load: () => {
            if (get().loaded) return Promise.resolve();
            if (!loadPromise) {
                loadPromise = loadRequestHistory()
                    .then((cached) => {
                        const pending = get().entries;
                        const merged =
                            pending.length > 0
                                ? [
                                      ...pending,
                                      ...cached.filter(
                                          (item) =>
                                              !pending.some(
                                                  (pendingItem) => pendingItem.id === item.id,
                                              ),
                                      ),
                                  ].slice(0, MAX_REQUEST_HISTORY)
                                : cached;
                        set({ entries: merged, loaded: true });
                        if (merged.length > 0) saveRequestHistory(merged);
                    })
                    .catch((error) => {
                        console.error('Failed to load request history:', error);
                        set({ loaded: true });
                        if (get().entries.length > 0) saveRequestHistory(get().entries);
                    })
                    .finally(() => {
                        loadPromise = null;
                    });
            }
            return loadPromise;
        },
        addEntry: (entry) => update([entry, ...get().entries], true),
        deleteEntry: (entryId) =>
            update(
                get().entries.filter((entry) => entry.id !== entryId),
                true,
            ),
        clearHistory: () => update([], true),
    };
});
