import { useCallback, useMemo, useState, type ReactNode } from 'react';
import type { ScriptConsoleSnapshot } from '../types/scriptConsole';
import {
    ScriptConsoleActionsContext,
    ScriptConsoleStateContext,
    type ScriptConsoleActionsContextValue,
    type ScriptConsoleStateContextValue,
} from './ScriptConsoleContext';

const MAX_CACHED_CONSOLES = 20;

interface ScriptConsoleStoreState {
    byCaseId: Record<string, ScriptConsoleSnapshot>;
    order: string[];
}

function trimCache(state: ScriptConsoleStoreState): ScriptConsoleStoreState {
    if (state.order.length <= MAX_CACHED_CONSOLES) {
        return state;
    }

    const overflow = state.order.length - MAX_CACHED_CONSOLES;
    const removedIds = state.order.slice(0, overflow);
    const nextByCaseId = { ...state.byCaseId };

    for (const caseId of removedIds) {
        delete nextByCaseId[caseId];
    }

    return {
        byCaseId: nextByCaseId,
        order: state.order.slice(overflow),
    };
}

export function ScriptConsoleProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<ScriptConsoleStoreState>({ byCaseId: {}, order: [] });

    const setScriptConsole = useCallback((caseId: string, snapshot: ScriptConsoleSnapshot) => {
        setState((prev) => {
            const nextOrder = prev.order.filter((id) => id !== caseId);
            nextOrder.push(caseId);
            return trimCache({
                byCaseId: { ...prev.byCaseId, [caseId]: snapshot },
                order: nextOrder,
            });
        });
    }, []);

    const clearScriptConsole = useCallback((caseId: string) => {
        setState((prev) => {
            if (!prev.byCaseId[caseId]) return prev;
            const nextByCaseId = { ...prev.byCaseId };
            delete nextByCaseId[caseId];
            return {
                byCaseId: nextByCaseId,
                order: prev.order.filter((id) => id !== caseId),
            };
        });
    }, []);

    const stateValue = useMemo<ScriptConsoleStateContextValue>(
        () => ({ consoles: state.byCaseId }),
        [state.byCaseId],
    );

    const actionsValue = useMemo<ScriptConsoleActionsContextValue>(
        () => ({ setScriptConsole, clearScriptConsole }),
        [clearScriptConsole, setScriptConsole],
    );

    return (
        <ScriptConsoleStateContext.Provider value={stateValue}>
            <ScriptConsoleActionsContext.Provider value={actionsValue}>
                {children}
            </ScriptConsoleActionsContext.Provider>
        </ScriptConsoleStateContext.Provider>
    );
}
