import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type { UndoCommand, UndoHistory } from '../../shared/platform/undo/types';
import {
    clearUndoHistory,
    createEmptyUndoHistory,
    popRedoCommand,
    popUndoCommand,
    pushUndoCommand,
} from '../../shared/platform/undo/undoHistory';

export interface UndoRedoStore {
    histories: Map<string, UndoHistory>;
    activeScopeId: string | null;
    canUndo: boolean;
    canRedo: boolean;
    push: (scopeId: string, command: UndoCommand) => void;
    clearScope: (scopeId: string) => void;
    setActiveScope: (scopeId: string) => void;
    releaseActiveScope: (scopeId: string) => void;
    registerFlush: (flush: () => void) => () => void;
    undo: () => boolean;
    redo: () => boolean;
}

export type UndoRedoActions = Pick<
    UndoRedoStore,
    | 'push'
    | 'clearScope'
    | 'setActiveScope'
    | 'releaseActiveScope'
    | 'registerFlush'
    | 'undo'
    | 'redo'
>;

export type UndoRedoState = Pick<UndoRedoStore, 'canUndo' | 'canRedo' | 'activeScopeId'>;

const flushCallbacks = new Set<() => void>();

function activeFlags(histories: Map<string, UndoHistory>, scopeId: string | null) {
    const history = scopeId ? histories.get(scopeId) : undefined;
    return {
        canUndo: (history?.past.length ?? 0) > 0,
        canRedo: (history?.future.length ?? 0) > 0,
    };
}

function runFlushCallbacks(): void {
    flushCallbacks.forEach((flush) => flush());
}

export const useUndoRedoStore = create<UndoRedoStore>((set, get) => ({
    histories: new Map(),
    activeScopeId: null,
    canUndo: false,
    canRedo: false,
    push: (scopeId, command) =>
        set((state) => {
            const histories = new Map(state.histories);
            histories.set(
                scopeId,
                pushUndoCommand(histories.get(scopeId) ?? createEmptyUndoHistory(), command),
            );
            return { histories, ...activeFlags(histories, state.activeScopeId) };
        }),
    clearScope: (scopeId) =>
        set((state) => {
            const histories = new Map(state.histories);
            histories.set(scopeId, clearUndoHistory());
            return { histories, ...activeFlags(histories, state.activeScopeId) };
        }),
    setActiveScope: (activeScopeId) =>
        set((state) => ({ activeScopeId, ...activeFlags(state.histories, activeScopeId) })),
    releaseActiveScope: (scopeId) =>
        set((state) => {
            if (state.activeScopeId !== scopeId) return state;
            return { activeScopeId: null, canUndo: false, canRedo: false };
        }),
    registerFlush: (flush) => {
        flushCallbacks.add(flush);
        return () => flushCallbacks.delete(flush);
    },
    undo: () => {
        runFlushCallbacks();
        const { activeScopeId, histories } = get();
        if (!activeScopeId) return false;
        const current = histories.get(activeScopeId);
        if (!current) return false;
        const { history, command } = popUndoCommand(current);
        if (!command) return false;
        command.undo();
        const nextHistories = new Map(histories);
        nextHistories.set(activeScopeId, history);
        set({ histories: nextHistories, ...activeFlags(nextHistories, activeScopeId) });
        return true;
    },
    redo: () => {
        runFlushCallbacks();
        const { activeScopeId, histories } = get();
        if (!activeScopeId) return false;
        const current = histories.get(activeScopeId);
        if (!current) return false;
        const { history, command } = popRedoCommand(current);
        if (!command) return false;
        command.redo();
        const nextHistories = new Map(histories);
        nextHistories.set(activeScopeId, history);
        set({ histories: nextHistories, ...activeFlags(nextHistories, activeScopeId) });
        return true;
    },
}));

/** Compatibility hooks retained for callers that need the previous public API. */
export function useUndoRedoActions(): UndoRedoActions {
    return useUndoRedoStore(
        useShallow(
            ({
                push,
                clearScope,
                setActiveScope,
                releaseActiveScope,
                registerFlush,
                undo,
                redo,
            }) => ({
                push,
                clearScope,
                setActiveScope,
                releaseActiveScope,
                registerFlush,
                undo,
                redo,
            }),
        ),
    );
}

export function useUndoRedoState(): UndoRedoState {
    return useUndoRedoStore(
        useShallow(({ canUndo, canRedo, activeScopeId }) => ({ canUndo, canRedo, activeScopeId })),
    );
}
