import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { RequestHistoryNavigationContext } from './requestHistoryNavigationContext';
import type { RequestHistoryView } from './requestHistoryNavigationContext';
import type { SqlTraceResult } from '@/shared/kcbp/types';

export function RequestHistoryNavigationProvider({ children }: { children: ReactNode }) {
    const [view, setView] = useState<RequestHistoryView>('editor');
    const [historyOpen, setHistoryOpen] = useState(false);
    const [detailId, setDetailId] = useState<string>();
    const [traceData, setTraceData] = useState<SqlTraceResult | null>(null);
    const [traceCaseName, setTraceCaseName] = useState('');
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
    const openTrace = useCallback((data: SqlTraceResult, caseName: string) => {
        setTraceData(data);
        setTraceCaseName(caseName);
        setView('trace');
    }, []);
    const closeTrace = useCallback(() => {
        setTraceData(null);
        setTraceCaseName('');
        setView('editor');
    }, []);
    const value = useMemo(
        () => ({
            view,
            historyOpen,
            detailId,
            traceData,
            traceCaseName,
            openHistory,
            closeHistory,
            openHistoryDetail,
            closeHistoryDetail,
            closeAllHistory,
            showEditor,
            openTrace,
            closeTrace,
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
            traceData,
            traceCaseName,
            openTrace,
            closeTrace,
            view,
        ],
    );

    return (
        <RequestHistoryNavigationContext.Provider value={value}>
            {children}
        </RequestHistoryNavigationContext.Provider>
    );
}
