import { randomUUID } from 'node:crypto';

/**
 * 单个运行：缓冲事件、维护 SSE 订阅者、承载未决的工具调用。
 *
 * 事件先写缓冲再广播，因此客户端晚于运行建立连接也能补齐历史事件。
 */
class Run {
    constructor(input) {
        this.id = randomUUID();
        this.input = input;
        this.events = [];
        this.subscribers = new Set();
        this.pending = new Map();
        this.cancelled = false;
        this.finished = false;
    }

    emit(event) {
        this.events.push(event);
        for (const send of this.subscribers) send(event);
    }

    subscribe(send) {
        this.subscribers.add(send);
        for (const event of this.events) send(event);
        return () => this.subscribers.delete(send);
    }

    /** 引擎请求宿主执行工具；结果由 POST /runs/:id/tool-results 回填。 */
    callTool(name, args) {
        if (this.cancelled) return Promise.reject(new Error('run cancelled'));
        const toolCallId = randomUUID();
        return new Promise((resolve, reject) => {
            this.pending.set(toolCallId, { resolve, reject });
            this.emit({ type: 'tool.call', call: { toolCallId, name, arguments: args ?? {} } });
        });
    }

    resolveTool(payload) {
        const entry = this.pending.get(payload?.toolCallId);
        if (!entry) return false;
        this.pending.delete(payload.toolCallId);
        if (payload.ok) entry.resolve(payload.result);
        else entry.reject(new Error(payload.error || 'tool failed'));
        return true;
    }

    cancel() {
        if (this.cancelled) return;
        this.cancelled = true;
        for (const entry of this.pending.values()) entry.reject(new Error('run cancelled'));
        this.pending.clear();
    }
}

export function createRunRegistry() {
    const runs = new Map();
    return {
        create(input) {
            const run = new Run(input);
            runs.set(run.id, run);
            return run;
        },
        get: (id) => runs.get(id),
        delete: (id) => runs.delete(id),
    };
}
