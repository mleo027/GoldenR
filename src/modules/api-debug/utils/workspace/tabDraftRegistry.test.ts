import { describe, expect, it, vi } from 'vitest';
import {
    flushAllTabDrafts,
    readPendingTabDrafts,
    registerTabDraftFlusher,
    registerTabDraftReader,
} from './tabDraftRegistry';

describe('tabDraftRegistry', () => {
    it('calls registered flushers and supports unregister', () => {
        const first = vi.fn();
        const second = vi.fn();
        const unregister = registerTabDraftFlusher(first);

        registerTabDraftFlusher(second);
        flushAllTabDrafts();
        expect(first).toHaveBeenCalledOnce();
        expect(second).toHaveBeenCalledOnce();

        unregister();
        first.mockClear();
        second.mockClear();
        flushAllTabDrafts();
        expect(first).not.toHaveBeenCalled();
        expect(second).toHaveBeenCalledOnce();
    });

    it('reads pending drafts before flushing', () => {
        const flusher = vi.fn();
        registerTabDraftFlusher(flusher);
        registerTabDraftReader(() => ({
            params: [{ name: 'interestflag', value: '1', type: 'string' }],
            address: '127.0.0.1:21000/150501',
        }));

        const snapshot = flushAllTabDrafts();

        expect(snapshot.params).toEqual([{ name: 'interestflag', value: '1', type: 'string' }]);
        expect(snapshot.address).toBe('127.0.0.1:21000/150501');
        expect(flusher).toHaveBeenCalledOnce();
        expect(readPendingTabDrafts().params).toEqual(snapshot.params);
        expect(readPendingTabDrafts().address).toBe(snapshot.address);
    });
});
