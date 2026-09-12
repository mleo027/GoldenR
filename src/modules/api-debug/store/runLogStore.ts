import { create } from 'zustand';
import type { RunLogEntry } from '../types/runLog';

// 兼容既有导入路径；类型定义已上移到 types/runLog，避免 service 依赖 store。
export type { RunLogEntry };

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
