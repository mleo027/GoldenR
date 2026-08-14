import type { UndoCommand, UndoHistory } from './types';

export const DEFAULT_UNDO_HISTORY_LIMIT = 50;

export function createEmptyUndoHistory(): UndoHistory {
    return { past: [], future: [] };
}

export function pushUndoCommand(
    history: UndoHistory,
    command: UndoCommand,
    limit = DEFAULT_UNDO_HISTORY_LIMIT,
): UndoHistory {
    return {
        past: [...history.past, command].slice(-limit),
        future: [],
    };
}

export function peekUndoCommand(history: UndoHistory): UndoCommand | undefined {
    return history.past[history.past.length - 1];
}

export function peekRedoCommand(history: UndoHistory): UndoCommand | undefined {
    return history.future[history.future.length - 1];
}

export function popUndoCommand(history: UndoHistory): {
    history: UndoHistory;
    command: UndoCommand | null;
} {
    if (history.past.length === 0) {
        return { history, command: null };
    }
    const past = history.past.slice(0, -1);
    const command = history.past[history.past.length - 1];
    return {
        history: {
            past,
            future: [...history.future, command],
        },
        command,
    };
}

export function popRedoCommand(history: UndoHistory): {
    history: UndoHistory;
    command: UndoCommand | null;
} {
    if (history.future.length === 0) {
        return { history, command: null };
    }
    const future = history.future.slice(0, -1);
    const command = history.future[history.future.length - 1];
    return {
        history: {
            past: [...history.past, command],
            future,
        },
        command,
    };
}

export function clearUndoHistory(): UndoHistory {
    return createEmptyUndoHistory();
}
