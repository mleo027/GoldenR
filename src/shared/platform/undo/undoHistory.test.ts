import { describe, expect, it, vi } from 'vitest';
import {
    createEmptyUndoHistory,
    DEFAULT_UNDO_HISTORY_LIMIT,
    peekRedoCommand,
    peekUndoCommand,
    popRedoCommand,
    popUndoCommand,
    pushUndoCommand,
} from './undoHistory';
import type { UndoCommand } from './types';

function command(id: string): UndoCommand {
    return {
        label: id,
        undo: vi.fn(),
        redo: vi.fn(),
    };
}

describe('undoHistory', () => {
    it('pushes commands and clears future', () => {
        const first = command('a');
        const second = command('b');
        let history = createEmptyUndoHistory();
        history = pushUndoCommand(history, first);
        history = pushUndoCommand(history, second);
        history = popUndoCommand(history).history;
        history = pushUndoCommand(history, command('c'));

        expect(history.past.map((item) => item.label)).toEqual(['a', 'c']);
        expect(history.future).toHaveLength(0);
    });

    it('caps history at the configured limit', () => {
        let history = createEmptyUndoHistory();
        for (let index = 0; index < DEFAULT_UNDO_HISTORY_LIMIT + 5; index += 1) {
            history = pushUndoCommand(history, command(String(index)));
        }
        expect(history.past).toHaveLength(DEFAULT_UNDO_HISTORY_LIMIT);
        expect(history.past[0]?.label).toBe('5');
    });

    it('pops undo and redo in order', () => {
        const first = command('a');
        const second = command('b');
        let history = pushUndoCommand(createEmptyUndoHistory(), first);
        history = pushUndoCommand(history, second);

        const undoStep = popUndoCommand(history);
        expect(peekUndoCommand(undoStep.history)?.label).toBe('a');
        expect(peekRedoCommand(undoStep.history)?.label).toBe('b');
        undoStep.command?.undo();

        const redoStep = popRedoCommand(undoStep.history);
        expect(peekUndoCommand(redoStep.history)?.label).toBe('b');
        redoStep.command?.redo();
    });
});
