import { describe, expect, it, vi } from 'vitest';
import { DebounceWriter } from './debounceWriter';

describe('DebounceWriter', () => {
    it('keeps only the latest scheduled value', async () => {
        vi.useFakeTimers();
        const write = vi.fn(async () => undefined);
        const writer = new DebounceWriter({ write, delayMs: 50 });
        writer.schedule(1);
        writer.schedule(2);
        writer.schedule(3);

        await vi.advanceTimersByTimeAsync(50);

        expect(write).toHaveBeenCalledTimes(1);
        expect(write).toHaveBeenCalledWith(3);
        vi.useRealTimers();
    });

    it('waits for an in-flight write before flushing pending data', async () => {
        vi.useFakeTimers();
        let resolveFirst: (() => void) | undefined;
        const write = vi.fn(
            () =>
                new Promise<void>((resolve) => {
                    resolveFirst = resolve;
                }),
        );
        const writer = new DebounceWriter({ write, delayMs: 50 });
        writer.schedule(1);
        await vi.advanceTimersByTimeAsync(50);
        writer.schedule(2);

        const flushPromise = writer.flush();
        expect(write).toHaveBeenCalledTimes(1);

        resolveFirst?.();
        await flushPromise;

        expect(write).toHaveBeenCalledTimes(2);
        expect(write).toHaveBeenLastCalledWith(2);
        vi.useRealTimers();
    });

    it('keeps the failed value pending for the next flush', async () => {
        const write = vi
            .fn()
            .mockRejectedValueOnce(new Error('disk busy'))
            .mockResolvedValueOnce(undefined);
        const writer = new DebounceWriter({ write, delayMs: 10 });
        writer.schedule('value');

        await expect(writer.flush()).rejects.toThrow('disk busy');
        expect(writer.hasPending).toBe(true);

        await expect(writer.flush()).resolves.toBeUndefined();
        expect(write).toHaveBeenCalledTimes(2);
    });

    it('keeps a newer scheduled value when an older write fails', async () => {
        vi.useFakeTimers();
        let rejectFirst: ((error: Error) => void) | undefined;
        const write = vi
            .fn()
            .mockImplementationOnce(
                () =>
                    new Promise<void>((_resolve, reject) => {
                        rejectFirst = reject;
                    }),
            )
            .mockResolvedValueOnce(undefined);
        const writer = new DebounceWriter({ write, delayMs: 10 });
        writer.schedule('first');

        await vi.advanceTimersByTimeAsync(10);
        writer.schedule('second-latest');
        rejectFirst?.(new Error('disk busy'));

        await expect(writer.flush()).resolves.toBeUndefined();

        expect(write).toHaveBeenCalledTimes(2);
        expect(write).toHaveBeenLastCalledWith('second-latest');
        vi.useRealTimers();
    });

    it('handles timer-driven write failures without leaking a rejected promise', async () => {
        vi.useFakeTimers();
        const onError = vi.fn();
        const write = vi.fn().mockRejectedValue(new Error('disk busy'));
        const writer = new DebounceWriter({ write, delayMs: 10, onError });
        writer.schedule('value');

        await vi.advanceTimersByTimeAsync(10);

        expect(write).toHaveBeenCalledTimes(1);
        expect(onError).toHaveBeenCalledWith(new Error('disk busy'));
        expect(writer.hasPending).toBe(true);
        vi.useRealTimers();
    });

    it('writes pending data on dispose', async () => {
        const write = vi.fn(async () => undefined);
        const writer = new DebounceWriter({ write, delayMs: 100 });
        writer.schedule('final');

        await writer.dispose();

        expect(write).toHaveBeenCalledTimes(1);
        expect(write).toHaveBeenCalledWith('final');
    });
});
