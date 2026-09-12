// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { UndoCommand } from '../../shared/platform/undo/types';
import { useUndoRedoStore } from './undoRedoStore';
import { useUndoScope } from './useUndoScope';

function command(id: string, log: string[]): UndoCommand {
    return {
        label: id,
        undo: () => log.push(`undo:${id}`),
        redo: () => log.push(`redo:${id}`),
    };
}

beforeEach(() => {
    useUndoRedoStore.setState({
        histories: new Map(),
        activeScopeId: null,
        canUndo: false,
        canRedo: false,
    });
});

describe('useUndoRedoStore', () => {
    it('keeps independent histories per scope and tracks active flags', () => {
        const log: string[] = [];
        const store = useUndoRedoStore.getState();
        store.push('case-a', command('a', log));
        store.push('case-b', command('b', log));

        store.setActiveScope('case-a');
        expect(useUndoRedoStore.getState()).toMatchObject({
            activeScopeId: 'case-a',
            canUndo: true,
            canRedo: false,
        });
        expect(store.undo()).toBe(true);
        expect(log).toEqual(['undo:a']);

        store.setActiveScope('case-b');
        expect(store.undo()).toBe(true);
        expect(log).toEqual(['undo:a', 'undo:b']);
    });

    it('supports undo, redo, and clears redo history after a new push', () => {
        const log: string[] = [];
        const store = useUndoRedoStore.getState();
        store.setActiveScope('case-a');
        store.push('case-a', command('a', log));
        expect(store.undo()).toBe(true);
        expect(useUndoRedoStore.getState().canRedo).toBe(true);
        expect(store.redo()).toBe(true);
        expect(log).toEqual(['undo:a', 'redo:a']);

        store.undo();
        store.push('case-a', command('b', log));
        expect(useUndoRedoStore.getState().canRedo).toBe(false);
        expect(
            useUndoRedoStore
                .getState()
                .histories.get('case-a')
                ?.past.map((item) => item.label),
        ).toEqual(['b']);
    });

    it('returns false without an active scope or available command', () => {
        const store = useUndoRedoStore.getState();
        expect(store.undo()).toBe(false);
        expect(store.redo()).toBe(false);
        store.setActiveScope('empty');
        expect(store.undo()).toBe(false);
        expect(store.redo()).toBe(false);
    });

    it('executes registered flush callbacks before undo and supports unregistering', () => {
        const log: string[] = [];
        const flush = vi.fn(() => log.push('flush'));
        const store = useUndoRedoStore.getState();
        const unregister = store.registerFlush(flush);
        store.setActiveScope('case-a');
        store.push('case-a', command('a', log));
        store.undo();
        expect(log).toEqual(['flush', 'undo:a']);
        unregister();
        store.redo();
        expect(flush).toHaveBeenCalledTimes(1);
    });

    it('releases the active scope and clears command availability', () => {
        const store = useUndoRedoStore.getState();
        store.push('case-a', command('a', []));
        store.setActiveScope('case-a');
        store.releaseActiveScope('case-a');
        expect(useUndoRedoStore.getState()).toMatchObject({
            activeScopeId: null,
            canUndo: false,
            canRedo: false,
        });
    });

    it('activates and releases a scope with the hook lifecycle', () => {
        const { unmount, rerender } = renderHook(
            ({ active }: { active: boolean }) => useUndoScope('case-a', { active }),
            { initialProps: { active: true } },
        );
        expect(useUndoRedoStore.getState().activeScopeId).toBe('case-a');
        rerender({ active: false });
        expect(useUndoRedoStore.getState().activeScopeId).toBeNull();
        unmount();
    });
});
