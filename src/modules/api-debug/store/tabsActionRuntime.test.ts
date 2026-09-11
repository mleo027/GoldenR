import { describe, expect, it, vi } from 'vitest';
import { applyUndoable, configureTabsActionRuntime, getInitialAddress } from './tabsActionRuntime';

describe('tabsActionRuntime', () => {
    it('forwards actions while configured and rejects calls after cleanup', () => {
        const update = vi.fn();
        const cleanup = configureTabsActionRuntime({
            getInitialAddress: () => '127.0.0.1:21000',
            getInitialProtocol: () => 'KCBP',
            applyUndoable: update,
        });

        expect(getInitialAddress()).toBe('127.0.0.1:21000');
        applyUndoable({ name: 'renamed' }, 'rename');
        expect(update).toHaveBeenCalledWith({ name: 'renamed' }, 'rename');

        cleanup();
        expect(() => getInitialAddress()).toThrow('Tabs action runtime is not configured');
    });

    it('does not let an older provider cleanup clear a newer runtime', () => {
        const cleanupOld = configureTabsActionRuntime({
            getInitialAddress: () => 'old',
            getInitialProtocol: () => 'KCBP',
            applyUndoable: vi.fn(),
        });
        const cleanupCurrent = configureTabsActionRuntime({
            getInitialAddress: () => 'current',
            getInitialProtocol: () => 'KUAB',
            applyUndoable: vi.fn(),
        });

        cleanupOld();
        expect(getInitialAddress()).toBe('current');
        cleanupCurrent();
    });
});
