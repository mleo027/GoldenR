import { createContext, useContext } from 'react';
import type { UndoCommand } from '../../shared/platform/undo/types';

export interface UndoRedoActions {
    push: (scopeId: string, command: UndoCommand) => void;
    clearScope: (scopeId: string) => void;
    setActiveScope: (scopeId: string) => void;
    releaseActiveScope: (scopeId: string) => void;
    registerFlush: (flush: () => void) => () => void;
    undo: () => boolean;
    redo: () => boolean;
}

export interface UndoRedoState {
    canUndo: boolean;
    canRedo: boolean;
    activeScopeId: string | null;
}

export const UndoRedoActionsContext = createContext<UndoRedoActions | null>(null);
export const UndoRedoStateContext = createContext<UndoRedoState | null>(null);

export function useUndoRedoActions(): UndoRedoActions {
    const ctx = useContext(UndoRedoActionsContext);
    if (!ctx) {
        throw new Error('useUndoRedoActions must be used within UndoRedoProvider');
    }
    return ctx;
}

export function useUndoRedoState(): UndoRedoState {
    const ctx = useContext(UndoRedoStateContext);
    if (!ctx) {
        throw new Error('useUndoRedoState must be used within UndoRedoProvider');
    }
    return ctx;
}
