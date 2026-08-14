import { createContext } from 'react';

export interface RunLogEntry {
    id: string;
    caseName: string;
    msgtype: string;
    success: boolean;
    timecost?: number;
    rows?: number;
    message: string;
    timestamp: number;
}

export interface RunLogStateContextValue {
    logs: RunLogEntry[];
}

export interface RunLogActionsContextValue {
    pushLog: (entry: Omit<RunLogEntry, 'id'>) => void;
    clearLogs: () => void;
}

/** @deprecated 兼容旧用法，优先使用 RunLogStateContext / RunLogActionsContext */
export interface RunLogContextValue extends RunLogStateContextValue, RunLogActionsContextValue {}

export const RunLogStateContext = createContext<RunLogStateContextValue | null>(null);
export const RunLogActionsContext = createContext<RunLogActionsContextValue | null>(null);
