import { useCallback, useMemo, useState, type ReactNode } from 'react';
import type { ResponseData } from '../types/workspace';
import {
    ResponseActionsContext,
    ResponseStateContext,
    type ResponseActionsContextValue,
    type ResponseStateContextValue,
} from './ResponseContext';

const MAX_CACHED_RESPONSES = 20;

interface ResponseStoreState {
    byCaseId: Record<string, ResponseData>;
    order: string[];
}

function trimCache(state: ResponseStoreState): ResponseStoreState {
    if (state.order.length <= MAX_CACHED_RESPONSES) {
        return state;
    }

    const overflow = state.order.length - MAX_CACHED_RESPONSES;
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

export function ResponseProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<ResponseStoreState>({ byCaseId: {}, order: [] });

    const setResponse = useCallback((caseId: string, response: ResponseData) => {
        setState((prev) => {
            const nextOrder = prev.order.filter((id) => id !== caseId);
            nextOrder.push(caseId);
            return trimCache({
                byCaseId: { ...prev.byCaseId, [caseId]: response },
                order: nextOrder,
            });
        });
    }, []);

    const clearResponse = useCallback((caseId: string) => {
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

    const stateValue = useMemo<ResponseStateContextValue>(
        () => ({ responses: state.byCaseId }),
        [state.byCaseId],
    );

    const actionsValue = useMemo<ResponseActionsContextValue>(
        () => ({ setResponse, clearResponse }),
        [clearResponse, setResponse],
    );

    return (
        <ResponseStateContext.Provider value={stateValue}>
            <ResponseActionsContext.Provider value={actionsValue}>
                {children}
            </ResponseActionsContext.Provider>
        </ResponseStateContext.Provider>
    );
}
