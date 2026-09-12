import { randomUUID } from 'node:crypto';
import type {
    CapabilityInvokeRequest,
    CapabilityInvokeResponse,
} from '../../../src/shared/capabilities/host';

/** 默认超时：能力可能包含一次场景运行，给足余量但必须有上限。 */
export const DEFAULT_CAPABILITY_TIMEOUT_MS = 60_000;

interface PendingCall {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
}

export interface CapabilityInvokerOptions {
    /** 把请求送到渲染层。注入以便单测不依赖 electron。 */
    send: (request: CapabilityInvokeRequest) => void;
    timeoutMs?: number;
    createRequestId?: () => string;
}

/**
 * 主进程侧的能力调用器：负责请求/应答关联、超时与在途清理。
 *
 * 刻意不 import electron——传输细节由调用方注入，这样关联与超时逻辑可以直接单测。
 */
export class CapabilityInvoker {
    private readonly pending = new Map<string, PendingCall>();
    private readonly send: (request: CapabilityInvokeRequest) => void;
    private readonly timeoutMs: number;
    private readonly createRequestId: () => string;

    constructor(options: CapabilityInvokerOptions) {
        this.send = options.send;
        this.timeoutMs = options.timeoutMs ?? DEFAULT_CAPABILITY_TIMEOUT_MS;
        this.createRequestId = options.createRequestId ?? randomUUID;
    }

    get pendingCount(): number {
        return this.pending.size;
    }

    invoke(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
        if (!name) return Promise.reject(new Error('缺少能力名'));
        const requestId = this.createRequestId();
        return new Promise<unknown>((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(requestId);
                reject(new Error(`能力调用超时（${this.timeoutMs}ms）：${name}`));
            }, this.timeoutMs);
            // 在途调用不应该拖住进程退出。
            timer.unref?.();
            this.pending.set(requestId, { resolve, reject, timer });
            try {
                this.send({ requestId, name, args });
            } catch (error) {
                // 送不出去就不要留着等超时。
                this.pending.delete(requestId);
                clearTimeout(timer);
                reject(error instanceof Error ? error : new Error(String(error)));
            }
        });
    }

    /** 渲染层回填。返回 false 表示该请求已超时或不存在（重复回填不再生效）。 */
    settle(response: CapabilityInvokeResponse): boolean {
        const entry = this.pending.get(response.requestId);
        if (!entry) return false;
        this.pending.delete(response.requestId);
        clearTimeout(entry.timer);
        if (response.ok) {
            entry.resolve(response.result);
        } else {
            entry.reject(new Error(response.error || '能力调用失败'));
        }
        return true;
    }

    /** 渲染层重载/退出时调用：在途请求不会再被回填，立即失败而不是干等超时。 */
    rejectAll(reason: string): void {
        for (const entry of [...this.pending.values()]) {
            clearTimeout(entry.timer);
            entry.reject(new Error(reason));
        }
        this.pending.clear();
    }
}
