import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { RequestHistoryEntry } from '../types/requestHistory';
import { loadRequestHistory, MAX_REQUEST_HISTORY, saveRequestHistory } from './requestHistoryData';
import {
    RequestHistoryActionsContext,
    RequestHistoryStateContext,
    type RequestHistoryActionsContextValue,
    type RequestHistoryStateContextValue,
} from './RequestHistoryContext';

export function RequestHistoryProvider({ children }: { children: ReactNode }) {
    const [entries, setEntries] = useState<RequestHistoryEntry[]>([]);
    const [loaded, setLoaded] = useState(false);
    const entriesRef = useRef(entries);
    const loadedRef = useRef(false);
    entriesRef.current = entries;
    loadedRef.current = loaded;

    useEffect(() => {
        void loadRequestHistory()
            .then((cached) => {
                const pending = entriesRef.current;
                const merged =
                    pending.length > 0
                        ? [
                              ...pending,
                              ...cached.filter(
                                  (cachedEntry) =>
                                      !pending.some(
                                          (pendingEntry) => pendingEntry.id === cachedEntry.id,
                                      ),
                              ),
                          ].slice(0, MAX_REQUEST_HISTORY)
                        : cached;
                entriesRef.current = merged;
                setEntries(merged);
                setLoaded(true);
                loadedRef.current = true;
                if (merged.length > 0) {
                    saveRequestHistory(merged);
                }
            })
            .catch((error) => {
                console.error('Failed to load request history:', error);
                setLoaded(true);
                loadedRef.current = true;
                if (entriesRef.current.length > 0) {
                    saveRequestHistory(entriesRef.current);
                }
            });
    }, []);

    const updateEntries = useCallback((next: RequestHistoryEntry[]) => {
        const trimmed = next.slice(0, MAX_REQUEST_HISTORY);
        entriesRef.current = trimmed;
        setEntries(trimmed);
    }, []);

    const persistEntries = useCallback(
        (next: RequestHistoryEntry[]) => {
            updateEntries(next);
            saveRequestHistory(next);
        },
        [updateEntries],
    );

    const addEntry = useCallback(
        (entry: RequestHistoryEntry) => {
            const next = [entry, ...entriesRef.current];
            if (loadedRef.current) {
                persistEntries(next);
            } else {
                updateEntries(next);
            }
        },
        [persistEntries, updateEntries],
    );

    const deleteEntry = useCallback(
        (entryId: string) => {
            const next = entriesRef.current.filter((entry) => entry.id !== entryId);
            if (loadedRef.current) {
                persistEntries(next);
            } else {
                updateEntries(next);
            }
        },
        [persistEntries, updateEntries],
    );

    const clearHistory = useCallback(() => {
        if (loadedRef.current) {
            persistEntries([]);
        } else {
            updateEntries([]);
        }
    }, [persistEntries, updateEntries]);

    const stateValue = useMemo<RequestHistoryStateContextValue>(
        () => ({ entries, loaded }),
        [entries, loaded],
    );

    const actionsValue = useMemo<RequestHistoryActionsContextValue>(
        () => ({ addEntry, deleteEntry, clearHistory }),
        [addEntry, clearHistory, deleteEntry],
    );

    return (
        <RequestHistoryStateContext.Provider value={stateValue}>
            <RequestHistoryActionsContext.Provider value={actionsValue}>
                {children}
            </RequestHistoryActionsContext.Provider>
        </RequestHistoryStateContext.Provider>
    );
}
