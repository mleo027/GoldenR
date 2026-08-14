import { describe, expect, it, vi } from 'vitest';
import { createSnapshotUndoCommand } from './createSnapshotUndoCommand';

describe('createSnapshotUndoCommand', () => {
    it('returns null when before and after are equal', () => {
        const value = { value: 1 };
        const command = createSnapshotUndoCommand({
            before: value,
            after: value,
            apply: vi.fn(),
        });
        expect(command).toBeNull();
    });

    it('applies snapshots on undo and redo', () => {
        const apply = vi.fn();
        const command = createSnapshotUndoCommand({
            label: 'edit',
            before: { value: 1 },
            after: { value: 2 },
            apply,
        });
        expect(command).not.toBeNull();
        expect(command?.label).toBe('edit');
        command?.undo();
        expect(apply).toHaveBeenCalledWith({ value: 1 });
        command?.redo();
        expect(apply).toHaveBeenCalledWith({ value: 2 });
    });

    it('supports custom equality', () => {
        const command = createSnapshotUndoCommand({
            before: { value: 1 },
            after: { value: 2 },
            isEqual: () => true,
            apply: vi.fn(),
        });
        expect(command).toBeNull();
    });
});
