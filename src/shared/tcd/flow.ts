export const MAX_FLOW_RUN_CASE_DEPTH = 10;

export class FlowRuntime {
    private readonly store = new Map<string, unknown>();
    private depth = 0;

    set(key: string, value: unknown): void {
        this.store.set(key, value);
    }

    get<T = unknown>(key: string): T | undefined {
        return this.store.get(key) as T | undefined;
    }

    snapshot(): Record<string, unknown> {
        return Object.fromEntries(this.store.entries());
    }

    enterRunCase(): void {
        this.depth += 1;
        if (this.depth > MAX_FLOW_RUN_CASE_DEPTH) {
            throw new Error(`flow.runCase 嵌套超过 ${MAX_FLOW_RUN_CASE_DEPTH} 层`);
        }
    }

    leaveRunCase(): void {
        this.depth = Math.max(0, this.depth - 1);
    }
}

export function createNoopFlowApi(): {
    set: () => void;
    get: () => undefined;
    runCase: () => Promise<never>;
} {
    return {
        set: () => {},
        get: () => undefined,
        runCase: async () => {
            throw new Error('flow.runCase 仅在 TCD 模式下可用');
        },
    };
}
