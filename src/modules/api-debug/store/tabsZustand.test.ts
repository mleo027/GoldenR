import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configureTabsActionRuntime } from './tabsActionRuntime';
import { useTabsStore } from './tabsZustand';

describe('useTabsStore Zustand facade', () => {
    let cleanup: (() => void) | undefined;

    beforeEach(() => {
        cleanup?.();
        useTabsStore.getState().reset();
        cleanup = configureTabsActionRuntime({
            getInitialAddress: () => 'host:21000/150501',
            getInitialProtocol: () => 'KCBP',
            applyUndoable: vi.fn(),
        });
    });

    it('keeps dispatch and action wrappers after reset', () => {
        const before = useTabsStore.getState();
        expect(typeof before.dispatch).toBe('function');
        expect(typeof before.addProject).toBe('function');

        before.reset();
        const after = useTabsStore.getState();
        after.addProject();

        expect(typeof after.dispatch).toBe('function');
        expect(useTabsStore.getState().projects).toHaveLength(2);
    });

    it('uses configured runtime for initial project and case data', () => {
        useTabsStore.getState().addProject();
        const project = useTabsStore.getState().projects.at(-1)!;
        expect(project.cases[0].address).toBe('host:21000/150501');
        expect(project.cases[0].protocol).toBe('KCBP');
    });

    it('reports a clear error when runtime is not configured', () => {
        cleanup?.();
        cleanup = undefined;
        expect(() => useTabsStore.getState().addProject()).toThrow(
            'Tabs action runtime is not configured',
        );
        expect(() => useTabsStore.getState().addCase()).toThrow(
            'Tabs action runtime is not configured',
        );
    });
});
