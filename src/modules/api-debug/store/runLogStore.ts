import { create } from 'zustand';

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

interface RunLogStoreState {
    logs: RunLogEntry[];
    pushLog: (entry: Omit<RunLogEntry, 'id'>) => void;
    clearLogs: () => void;
}

const MAX_LOGS = 50;

export const useRunLogStore = create<RunLogStoreState>((set) => ({
    logs: [],
    pushLog: (entry) =>
        set((state) => ({
            logs: [
                { ...entry, id: `${entry.timestamp}-${Math.random().toString(36).slice(2, 8)}` },
                ...state.logs,
            ].slice(0, MAX_LOGS),
        })),
    clearLogs: () => set({ logs: [] }),
}));
