import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushWorkspaceDrafts, registerWorkspaceDraftFlusher } from './workspaceFlushRegistry';

const unregisterFlushers: Array<() => void> = [];

afterEach(() => {
    unregisterFlushers.forEach((unregister) => unregister());
    unregisterFlushers.length = 0;
});

describe('workspaceFlushRegistry', () => {
    it('runs all registered workspace flushers', async () => {
        const first = vi.fn(async () => undefined);
        const second = vi.fn(async () => undefined);
        unregisterFlushers.push(
            registerWorkspaceDraftFlusher(first),
            registerWorkspaceDraftFlusher(second),
        );

        await flushWorkspaceDrafts();

        expect(first).toHaveBeenCalledOnce();
        expect(second).toHaveBeenCalledOnce();
    });

    it('aggregates workspace flush failures without skipping the remaining flushers', async () => {
        const first = vi.fn(async () => {
            throw new Error('first failed');
        });
        const second = vi.fn(async () => undefined);
        unregisterFlushers.push(
            registerWorkspaceDraftFlusher(first),
            registerWorkspaceDraftFlusher(second),
        );

        await expect(flushWorkspaceDrafts()).rejects.toThrow('first failed');
        expect(second).toHaveBeenCalledOnce();
    });
});
