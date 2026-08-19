import {
    useCallback,
    useMemo,
    useRef,
    useState,
    type MutableRefObject,
    type ReactNode,
} from 'react';
import type { UndoCommand } from '../../shared/platform/undo/types';
import {
    clearUndoHistory,
    createEmptyUndoHistory,
    popRedoCommand,
    popUndoCommand,
    pushUndoCommand,
} from '../../shared/platform/undo/undoHistory';
import {
    UndoRedoActionsContext,
    UndoRedoStateContext,
    type UndoRedoActions,
    type UndoRedoState,
} from './UndoRedoContext';

function getScopeHistory(
    store: Map<string, ReturnType<typeof createEmptyUndoHistory>>,
    scopeId: string,
) {
    const existing = store.get(scopeId);
    if (existing) return existing;
    const next = createEmptyUndoHistory();
    store.set(scopeId, next);
    return next;
}

function useUndoRedoActions({
    historiesRef,
    activeScopeRef,
    flushCallbacksRef,
    bump,
}: {
    historiesRef: MutableRefObject<Map<string, ReturnType<typeof createEmptyUndoHistory>>>;
    activeScopeRef: MutableRefObject<string | null>;
    flushCallbacksRef: MutableRefObject<Set<() => void>>;
    bump: () => void;
}) {
    const runFlushCallbacks = useCallback(() => {
        flushCallbacksRef.current?.forEach((flush) => {
            flush();
        });
    }, [flushCallbacksRef]);

    const push = useCallback(
        (scopeId: string, command: UndoCommand) => {
            const histories = historiesRef.current;
            if (!histories) return;
            const nextHistory = pushUndoCommand(getScopeHistory(histories, scopeId), command);
            histories.set(scopeId, nextHistory);
            bump();
        },
        [bump, historiesRef],
    );

    const clearScope = useCallback(
        (scopeId: string) => {
            const histories = historiesRef.current;
            if (!histories) return;
            histories.set(scopeId, clearUndoHistory());
            bump();
        },
        [bump, historiesRef],
    );

    const setActiveScope = useCallback(
        (scopeId: string) => {
            activeScopeRef.current = scopeId;
            bump();
        },
        [activeScopeRef, bump],
    );

    const releaseActiveScope = useCallback(
        (scopeId: string) => {
            if (activeScopeRef.current !== scopeId) return;
            activeScopeRef.current = null;
            bump();
        },
        [activeScopeRef, bump],
    );

    const registerFlush = useCallback(
        (flush: () => void) => {
            flushCallbacksRef.current?.add(flush);
            return () => {
                flushCallbacksRef.current?.delete(flush);
            };
        },
        [flushCallbacksRef],
    );

    const undo = useCallback(() => {
        runFlushCallbacks();
        const scopeId = activeScopeRef.current;
        if (!scopeId) return false;

        const histories = historiesRef.current;
        const current = histories?.get(scopeId);
        if (!current) return false;

        const { history, command } = popUndoCommand(current);
        if (!command) return false;

        command.undo();
        histories?.set(scopeId, history);
        bump();
        return true;
    }, [activeScopeRef, bump, historiesRef, runFlushCallbacks]);

    const redo = useCallback(() => {
        runFlushCallbacks();
        const scopeId = activeScopeRef.current;
        if (!scopeId) return false;

        const histories = historiesRef.current;
        const current = histories?.get(scopeId);
        if (!current) return false;

        const { history, command } = popRedoCommand(current);
        if (!command) return false;

        command.redo();
        histories?.set(scopeId, history);
        bump();
        return true;
    }, [activeScopeRef, bump, historiesRef, runFlushCallbacks]);

    return useMemo<UndoRedoActions>(
        () => ({
            push,
            clearScope,
            setActiveScope,
            releaseActiveScope,
            registerFlush,
            undo,
            redo,
        }),
        [clearScope, push, redo, registerFlush, releaseActiveScope, setActiveScope, undo],
    );
}

export function UndoRedoProvider({ children }: { children: ReactNode }) {
    const historiesRef = useRef(new Map<string, ReturnType<typeof createEmptyUndoHistory>>());
    const activeScopeRef = useRef<string | null>(null);
    const flushCallbacksRef = useRef(new Set<() => void>());
    const [revision, setRevision] = useState(0);

    const bump = useCallback(() => {
        setRevision((value) => value + 1);
    }, []);

    const actions = useUndoRedoActions({
        historiesRef,
        activeScopeRef,
        flushCallbacksRef,
        bump,
    });

    const activeScopeId = activeScopeRef.current;
    const activeHistory = activeScopeId ? historiesRef.current.get(activeScopeId) : undefined;

    const state = useMemo<UndoRedoState>(
        () => ({
            canUndo: (activeHistory?.past.length ?? 0) > 0,
            canRedo: (activeHistory?.future.length ?? 0) > 0,
            activeScopeId,
        }),
        // revision drives recomputation when histories change
        // eslint-disable-next-line react-hooks/exhaustive-deps -- revision is intentional
        [activeHistory?.future.length, activeHistory?.past.length, activeScopeId, revision],
    );

    return (
        <UndoRedoActionsContext.Provider value={actions}>
            <UndoRedoStateContext.Provider value={state}>{children}</UndoRedoStateContext.Provider>
        </UndoRedoActionsContext.Provider>
    );
}
