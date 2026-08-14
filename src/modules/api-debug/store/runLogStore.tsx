import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
    RunLogActionsContext,
    RunLogStateContext,
    type RunLogActionsContextValue,
    type RunLogEntry,
    type RunLogStateContextValue,
} from './RunLogContext';

const MAX_LOGS = 50;

export function RunLogProvider({ children }: { children: ReactNode }) {
    const [logs, setLogs] = useState<RunLogEntry[]>([]);

    const pushLog = useCallback((entry: Omit<RunLogEntry, 'id'>) => {
        setLogs((prev) =>
            [
                { ...entry, id: `${entry.timestamp}-${Math.random().toString(36).slice(2, 8)}` },
                ...prev,
            ].slice(0, MAX_LOGS),
        );
    }, []);

    const clearLogs = useCallback(() => setLogs([]), []);

    const stateValue = useMemo<RunLogStateContextValue>(() => ({ logs }), [logs]);

    const actionsValue = useMemo<RunLogActionsContextValue>(
        () => ({ pushLog, clearLogs }),
        [clearLogs, pushLog],
    );

    return (
        <RunLogStateContext.Provider value={stateValue}>
            <RunLogActionsContext.Provider value={actionsValue}>
                {children}
            </RunLogActionsContext.Provider>
        </RunLogStateContext.Provider>
    );
}
