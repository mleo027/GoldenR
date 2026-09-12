import { create } from 'zustand';
import type { ScriptConsoleSnapshot } from '../types/scriptConsole';

const MAX_CACHED_CONSOLES = 20;

interface ScriptConsoleStoreState {
    consoles: Record<string, ScriptConsoleSnapshot | undefined>;
    order: string[];
    setScriptConsole: (caseId: string, snapshot: ScriptConsoleSnapshot) => void;
    clearScriptConsole: (caseId: string) => void;
}

export const useScriptConsoleStore = create<ScriptConsoleStoreState>((set) => ({
    consoles: {},
    order: [],
    setScriptConsole: (caseId, snapshot) =>
        set((state) => {
            const order = [...state.order.filter((id) => id !== caseId), caseId];
            const consoles = { ...state.consoles, [caseId]: snapshot };
            const overflow = order.length - MAX_CACHED_CONSOLES;
            if (overflow <= 0) return { consoles, order };
            const nextConsoles = { ...consoles };
            for (const id of order.slice(0, overflow)) delete nextConsoles[id];
            return { consoles: nextConsoles, order: order.slice(overflow) };
        }),
    clearScriptConsole: (caseId) =>
        set((state) => {
            if (!state.consoles[caseId]) return state;
            const consoles = { ...state.consoles };
            delete consoles[caseId];
            return { consoles, order: state.order.filter((id) => id !== caseId) };
        }),
}));
