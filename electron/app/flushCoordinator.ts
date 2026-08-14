import { randomUUID } from 'node:crypto';

export type FlushCompletionReason = 'complete' | 'timeout';

interface ActiveFlush {
    id: string;
    pendingWindowIds: Set<number>;
    timer: ReturnType<typeof setTimeout>;
}

interface FlushCoordinatorOptions {
    timeoutMs?: number;
    scheduleTimer?: (handler: () => void, ms: number) => ReturnType<typeof setTimeout>;
    clearTimer?: (timer: ReturnType<typeof setTimeout>) => void;
    createId?: () => string;
    onFinish?: (reason: FlushCompletionReason, requestId: string) => void;
}

export class FlushCoordinator {
    private active: ActiveFlush | null = null;
    private readonly timeoutMs: number;
    private readonly scheduleTimer: (
        handler: () => void,
        ms: number,
    ) => ReturnType<typeof setTimeout>;
    private readonly clearTimer: (timer: ReturnType<typeof setTimeout>) => void;
    private readonly createId: () => string;
    private readonly onFinish: (reason: FlushCompletionReason, requestId: string) => void;

    constructor(options: FlushCoordinatorOptions = {}) {
        this.timeoutMs = options.timeoutMs ?? 3000;
        this.scheduleTimer = options.scheduleTimer ?? ((handler, ms) => setTimeout(handler, ms));
        this.clearTimer = options.clearTimer ?? ((timer) => clearTimeout(timer));
        this.createId = options.createId ?? (() => randomUUID());
        this.onFinish = options.onFinish ?? (() => undefined);
    }

    begin(windowIds: number[]): string | null {
        if (this.active) return null;
        const id = this.createId();
        const timer = this.scheduleTimer(() => this.finish('timeout', id), this.timeoutMs);
        this.active = {
            id,
            pendingWindowIds: new Set(windowIds),
            timer,
        };
        return id;
    }

    complete(windowId: number, requestId: string): boolean {
        const active = this.active;
        if (!active || active.id !== requestId) return false;
        active.pendingWindowIds.delete(windowId);
        if (active.pendingWindowIds.size === 0) {
            this.finish('complete', requestId);
        }
        return true;
    }

    handleWindowClosed(windowId: number): void {
        const active = this.active;
        if (!active) return;
        active.pendingWindowIds.delete(windowId);
        if (active.pendingWindowIds.size === 0) {
            this.finish('complete', active.id);
        }
    }

    get isActive(): boolean {
        return this.active !== null;
    }

    private finish(reason: FlushCompletionReason, requestId: string): void {
        const active = this.active;
        if (!active || active.id !== requestId) return;
        this.active = null;
        this.clearTimer(active.timer);
        this.onFinish(reason, requestId);
    }
}
