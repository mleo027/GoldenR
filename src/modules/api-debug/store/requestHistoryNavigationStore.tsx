import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { RequestHistoryNavigationContext } from './requestHistoryNavigationContext';
import type { RequestHistoryView } from './requestHistoryNavigationContext';

export function RequestHistoryNavigationProvider({ children }: { children: ReactNode }) {
    const [view, setView] = useState<RequestHistoryView>('editor');
    const [historyOpen, setHistoryOpen] = useState(false);
    const [detailId, setDetailId] = useState<string>();
    const openHistory = useCallback(() => {
        setHistoryOpen(true);
        setView('history');
    }, []);
    const closeHistory = useCallback(() => {
        setHistoryOpen(false);
        setDetailId(undefined);
        setView('editor');
    }, []);
    const openHistoryDetail = useCallback((entryId: string) => {
        setHistoryOpen(true);
        setDetailId(entryId);
        setView('history-detail');
    }, []);
    const closeHistoryDetail = useCallback(() => {
        setDetailId(undefined);
        setView('history');
    }, []);
    const closeAllHistory = useCallback(() => {
        setHistoryOpen(false);
        setDetailId(undefined);
        setView('editor');
    }, []);
    const showEditor = useCallback(() => setView('editor'), []);
    const value = useMemo(
        () => ({
            view,
            historyOpen,
            detailId,
            openHistory,
            closeHistory,
            openHistoryDetail,
            closeHistoryDetail,
            closeAllHistory,
            showEditor,
        }),
        [
            closeAllHistory,
            closeHistory,
            closeHistoryDetail,
            detailId,
            historyOpen,
            openHistory,
            openHistoryDetail,
            showEditor,
            view,
        ],
    );

    return (
        <RequestHistoryNavigationContext.Provider value={value}>
            {children}
        </RequestHistoryNavigationContext.Provider>
    );
}
