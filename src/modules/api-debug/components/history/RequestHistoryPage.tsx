import { useMemo, useState } from 'react';
import { useRequestHistoryActions, useRequestHistoryState } from '../../store/useRequestHistory';
import HistoryList from './HistoryList';
import HistoryToolbar from './HistoryToolbar';
import { useHistoryActions } from './useHistoryActions';
import { useRequestHistoryNavigation } from '../../store/useRequestHistoryNavigation';
import {
    getResultSummary,
    isWithinTime,
    type ResultFilter,
    type TimeFilter,
} from './historyFormat';
import type { RequestHistoryEntry } from '../../types/requestHistory';

interface RequestHistoryPageProps {
    onClose: () => void;
}

function HistoryWorkspace({
    loaded,
    filtered,
    selectedId,
    onOpenDetail,
    onReplay,
    onLoad,
    onCopy,
    onDelete,
}: {
    loaded: boolean;
    filtered: RequestHistoryEntry[];
    selectedId?: string;
    onOpenDetail: (entry: RequestHistoryEntry) => void;
    onReplay: (entry: RequestHistoryEntry) => void;
    onLoad: (entry: RequestHistoryEntry) => void;
    onCopy: (entry: RequestHistoryEntry) => void;
    onDelete: (entryId: string) => void;
}) {
    if (!loaded) {
        return <div className="p-8 text-center text-[var(--color-text-muted)]">加载中...</div>;
    }

    return (
        <div className="request-history-body flex flex-1 min-h-0 min-w-0 flex-col">
            <div className="request-history-table-wrap flex-1 min-w-0 overflow-auto">
                <HistoryList
                    entries={filtered}
                    selectedId={selectedId}
                    onOpenDetail={onOpenDetail}
                    onReplay={onReplay}
                    onLoad={onLoad}
                    onCopy={onCopy}
                    onDelete={onDelete}
                />
            </div>
        </div>
    );
}

export default function RequestHistoryPage({ onClose }: RequestHistoryPageProps) {
    const { entries, loaded } = useRequestHistoryState();
    const { deleteEntry } = useRequestHistoryActions();
    const { loadEntry, handleReplay, handleCopy } = useHistoryActions(onClose);
    const { detailId, openHistoryDetail } = useRequestHistoryNavigation();
    const [query, setQuery] = useState('');
    const [resultFilter, setResultFilter] = useState<ResultFilter>('all');
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('day');
    const [environment, setEnvironment] = useState<string>();
    const [mode, setMode] = useState<string>();

    const environments = useMemo(
        () => [
            ...new Set(
                entries
                    .map((entry) => entry.environmentName)
                    .filter((name): name is string => Boolean(name)),
            ),
        ],
        [entries],
    );

    const filtered = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        return entries.filter((entry) => {
            if (resultFilter === 'failed' && entry.outcome.success) return false;
            if (resultFilter === 'success' && !entry.outcome.success) return false;
            if (environment && entry.environmentName !== environment) return false;
            if (mode && entry.mode !== mode) return false;
            if (!isWithinTime(entry, timeFilter)) return false;
            if (!keyword) return true;
            return [
                entry.caseName,
                entry.projectName,
                entry.request.msgtype,
                entry.request.address,
                getResultSummary(entry),
                entry.response.message,
            ]
                .filter(Boolean)
                .some((text) => String(text).toLowerCase().includes(keyword));
        });
    }, [entries, environment, mode, query, resultFilter, timeFilter]);

    const counts = useMemo(
        () => ({
            all: entries.length,
            failed: entries.filter((entry) => !entry.outcome.success).length,
            success: entries.filter((entry) => entry.outcome.success).length,
        }),
        [entries],
    );

    const clearFilters = () => {
        setQuery('');
        setResultFilter('all');
        setTimeFilter('day');
        setEnvironment(undefined);
        setMode(undefined);
    };

    return (
        <div className="request-history-page flex flex-col h-full min-h-0">
            <HistoryToolbar
                counts={counts}
                query={query}
                resultFilter={resultFilter}
                timeFilter={timeFilter}
                environment={environment}
                mode={mode}
                environments={environments}
                onQueryChange={setQuery}
                onResultChange={setResultFilter}
                onTimeChange={setTimeFilter}
                onEnvironmentChange={setEnvironment}
                onModeChange={setMode}
                onClear={clearFilters}
            />

            <HistoryWorkspace
                loaded={loaded}
                filtered={filtered}
                selectedId={detailId}
                onOpenDetail={(entry) => openHistoryDetail(entry.id)}
                onReplay={handleReplay}
                onLoad={(entry) => {
                    loadEntry(entry);
                    onClose();
                }}
                onCopy={handleCopy}
                onDelete={deleteEntry}
            />
        </div>
    );
}
