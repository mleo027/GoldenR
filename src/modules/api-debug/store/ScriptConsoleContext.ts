import { createContext } from 'react';
import type { ScriptConsoleSnapshot } from '../types/scriptConsole';

export interface ScriptConsoleStateContextValue {
    consoles: Record<string, ScriptConsoleSnapshot | undefined>;
}

export interface ScriptConsoleActionsContextValue {
    setScriptConsole: (caseId: string, snapshot: ScriptConsoleSnapshot) => void;
    clearScriptConsole: (caseId: string) => void;
}

export const ScriptConsoleStateContext = createContext<ScriptConsoleStateContextValue | null>(null);
export const ScriptConsoleActionsContext = createContext<ScriptConsoleActionsContextValue | null>(
    null,
);
