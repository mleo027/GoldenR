type Timer = ReturnType<typeof setTimeout>;

interface DebounceWriterOptions<T> {
    write: (value: T) => Promise<void>;
    delayMs: number;
    schedule?: (handler: () => void, ms: number) => Timer;
    clear?: (timer: Timer) => void;
    onError?: (error: unknown) => void;
}

export class DebounceWriter<T> {
    private timer: Timer | null = null;
    private pendingValue: T | undefined;
    private writing: Promise<void> | null = null;
    private disposed = false;
    private readonly writeValue: (value: T) => Promise<void>;
    private readonly delayMs: number;
    private readonly scheduleTimer: (handler: () => void, ms: number) => Timer;
    private readonly clearTimer: (timer: Timer) => void;
    private readonly onError?: (error: unknown) => void;

    constructor(options: DebounceWriterOptions<T>) {
        this.writeValue = options.write;
        this.delayMs = options.delayMs;
        this.scheduleTimer = options.schedule ?? ((handler, ms) => setTimeout(handler, ms));
        this.clearTimer = options.clear ?? ((timer) => clearTimeout(timer));
        this.onError = options.onError;
    }

    schedule(value: T): void {
        if (this.disposed) return;
        this.pendingValue = value;
        if (this.timer) {
            this.clearTimer(this.timer);
        }
        this.timer = this.scheduleTimer(() => {
            this.timer = null;
            void this.drain().catch(() => undefined);
        }, this.delayMs);
    }

    async flush(): Promise<void> {
        if (this.timer) {
            this.clearTimer(this.timer);
            this.timer = null;
        }
        return this.drain();
    }

    async dispose(): Promise<void> {
        this.disposed = true;
        if (this.timer) {
            this.clearTimer(this.timer);
            this.timer = null;
        }
        return this.drain();
    }

    get hasPending(): boolean {
        return this.pendingValue !== undefined || this.writing !== null;
    }

    private async drain(): Promise<void> {
        if (this.writing) {
            await this.writing.catch(() => undefined);
            if (this.pendingValue !== undefined) {
                return this.drain();
            }
            return;
        }

        const value = this.pendingValue;
        if (value === undefined) return;
        this.pendingValue = undefined;
        this.writing = Promise.resolve()
            .then(() => this.writeValue(value))
            .catch((error: unknown) => {
                if (this.pendingValue === undefined) {
                    this.pendingValue = value;
                }
                this.onError?.(error);
                throw error;
            });
        try {
            await this.writing;
        } finally {
            this.writing = null;
        }

        if (this.pendingValue !== undefined) {
            return this.drain();
        }
    }
}
