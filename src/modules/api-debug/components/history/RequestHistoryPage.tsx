import { useMemo, useState } from 'react';
import { useApiDebugEnv } from '../../store/useApiDebugEnv';
import { useRequestHistoryActions, useRequestHistoryState } from '../../store/useRequestHistory';
import { useTabsActions } from '../../store/useTabs';
import { useKcbpCall } from '../../hooks/useKcbpCall';
import HistoryDetail from './HistoryDetail';
import HistoryList from './HistoryList';
import HistoryToolbar from './HistoryToolbar';
import {
    getResultSummary,
    isWithinTime,
    type DetailMode,
    type ResultFilter,
    type TimeFilter,
} from './historyFormat';
import type { RequestHistoryEntry } from '../../types/requestHistory';

interface RequestHistoryPageProps {
    onClose: () => void;
}

function useHistoryActions(onClose: () => void) {
    const { updateTabUndoable } = useTabsActions();
    const { updateEnv } = useApiDebugEnv();
    const { run } = useKcbpCall();

    const loadEntry = (entry: RequestHistoryEntry) => {
        updateTabUndoable(
            {
                address: entry.request.address,
                params: entry.request.params,
                ...(entry.request.script !== undefined ? { script: entry.request.script } : {}),
                ...(entry.request.runInput !== undefined
                    ? { runInput: entry.request.runInput }
                    : {}),
            },
            '载入历史请求',
        );
        updateEnv('editorMode', entry.mode === 'ui' ? 'ui' : 'script');
    };

    const handleReplay = (entry: RequestHistoryEntry) => {
        loadEntry(entry);
        onClose();
        window.setTimeout(() => {
            void run();
        }, 50);
    };

    const handleCopy = (entry: RequestHistoryEntry) => {
        void navigator.clipboard?.writeText(JSON.stringify(entry.request, null, 2));
    };

    return { loadEntry, handleReplay, handleCopy };
}

function HistoryWorkspace({
    loaded,
    detailMode,
    filtered,
    selected,
    onSelect,
    onReplay,
    onLoad,
    onCopy,
    onDelete,
}: {
    loaded: boolean;
    detailMode: DetailMode;
    filtered: RequestHistoryEntry[];
    selected?: RequestHistoryEntry;
    onSelect: (entry: RequestHistoryEntry) => void;
    onReplay: (entry: RequestHistoryEntry) => void;
    onLoad: (entry: RequestHistoryEntry) => void;
    onCopy: (entry: RequestHistoryEntry) => void;
    onDelete: (entryId: string) => void;
}) {
    if (!loaded) {
        return <div className="p-8 text-center text-[var(--color-text-muted)]">加载中...</div>;
    }

    const detail = selected ? (
        <HistoryDetail
            entry={selected}
            onLoad={() => onLoad(selected)}
            onReplay={() => onReplay(selected)}
            onCopy={() => onCopy(selected)}
            onDelete={() => onDelete(selected.id)}
        />
    ) : null;

    return (
        <div
            className={`request-history-body flex flex-1 min-h-0 min-w-0${
                detailMode === 'right' ? ' flex-row' : ' flex-col'
            }`}
        >
            <div className="request-history-table-wrap flex-1 min-w-0 overflow-auto">
                <HistoryList
                    entries={filtered}
                    selectedId={selected?.id}
                    onSelect={onSelect}
                    onReplay={onReplay}
                    onLoad={onLoad}
                    onCopy={onCopy}
                    onDelete={onDelete}
                />
            </div>

            {detailMode === 'right' && detail ? (
                <div className="w-[420px] shrink-0 border-l border-[var(--color-divider)] min-h-0">
                    {detail}
                </div>
            ) : null}

            {detailMode === 'bottom' ? (
                <div className="h-[42%] min-h-[240px] shrink-0 border-t border-[var(--color-divider)] min-w-0">
                    {detail}
                </div>
            ) : null}
        </div>
    );
}

export default function RequestHistoryPage({ onClose }: RequestHistoryPageProps) {
    const { entries, loaded } = useRequestHistoryState();
    const { deleteEntry } = useRequestHistoryActions();
    const { loadEntry, handleReplay, handleCopy } = useHistoryActions(onClose);
    const [query, setQuery] = useState('');
    const [resultFilter, setResultFilter] = useState<ResultFilter>('all');
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('day');
    const [environment, setEnvironment] = useState<string>();
    const [mode, setMode] = useState<string>();
    const [detailMode, setDetailMode] = useState<DetailMode>('bottom');
    const [selectedId, setSelectedId] = useState<string>();

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

    const selected = filtered.find((entry) => entry.id === selectedId) ?? filtered[0];

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
                detailMode={detailMode}
                onQueryChange={setQuery}
                onResultChange={setResultFilter}
                onTimeChange={setTimeFilter}
                onEnvironmentChange={setEnvironment}
                onModeChange={setMode}
                onDetailModeChange={setDetailMode}
                onClear={clearFilters}
                onClose={onClose}
            />

            <HistoryWorkspace
                loaded={loaded}
                detailMode={detailMode}
                filtered={filtered}
                selected={selected}
                onSelect={(entry) => setSelectedId(entry.id)}
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
