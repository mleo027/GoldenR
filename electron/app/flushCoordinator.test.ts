import { describe, expect, it, vi } from 'vitest';
import { FlushCoordinator } from './flushCoordinator';

function createCoordinator(onFinish = vi.fn()) {
    let nextId = 0;
    return {
        coordinator: new FlushCoordinator({
            createId: () => `flush-${++nextId}`,
            onFinish,
        }),
        onFinish,
    };
}

describe('FlushCoordinator', () => {
    it('finishes after all windows confirm', () => {
        vi.useFakeTimers();
        const { coordinator, onFinish } = createCoordinator();
        const requestId = coordinator.begin([1, 2]);
        expect(requestId).toBe('flush-1');

        expect(coordinator.complete(1, requestId!)).toBe(true);
        expect(onFinish).not.toHaveBeenCalled();
        expect(coordinator.complete(2, requestId!)).toBe(true);

        expect(onFinish).toHaveBeenCalledWith('complete', 'flush-1');
        vi.useRealTimers();
    });

    it('ignores duplicate begin requests and wrong request ids', () => {
        vi.useFakeTimers();
        const { coordinator, onFinish } = createCoordinator();
        const requestId = coordinator.begin([1]);
        expect(coordinator.begin([1])).toBeNull();
        expect(coordinator.complete(1, 'wrong')).toBe(false);
        expect(coordinator.complete(1, requestId!)).toBe(true);

        expect(onFinish).toHaveBeenCalledWith('complete', requestId);
        vi.useRealTimers();
    });

    it('finishes when all windows close before confirming', () => {
        vi.useFakeTimers();
        const { coordinator, onFinish } = createCoordinator();
        const requestId = coordinator.begin([1]);
        coordinator.handleWindowClosed(1);

        expect(onFinish).toHaveBeenCalledWith('complete', requestId);
        vi.useRealTimers();
    });

    it('finishes with timeout when windows do not confirm', () => {
        vi.useFakeTimers();
        const { coordinator, onFinish } = createCoordinator();
        const requestId = coordinator.begin([1]);
        expect(coordinator.isActive).toBe(true);

        vi.runAllTimers();

        expect(onFinish).toHaveBeenCalledWith('timeout', requestId);
        expect(coordinator.isActive).toBe(false);
        vi.useRealTimers();
    });
});
