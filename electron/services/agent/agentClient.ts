import type {
    AgentCreateRunRequest,
    AgentCreateRunResult,
    AgentHelloResult,
    AgentRunEvent,
    AgentToolResultRequest,
} from '../../../src/shared/agent/protocol';

/**
 * Agent sidecar 的 HTTP + SSE 客户端。
 *
 * 这是主进程与 sidecar 之间唯一的传输实现；契约类型来自
 * `src/shared/agent/protocol.ts`，因此 sidecar 整体替换后仍受同一契约约束。
 */
export class AgentHttpClient {
    private readonly port: number;
    private readonly token: string;

    constructor(port: number, token: string) {
        this.port = port;
        this.token = token;
    }

    private url(route: string): string {
        return `http://127.0.0.1:${this.port}${route}`;
    }

    private headers(json: boolean): Record<string, string> {
        return {
            authorization: `Bearer ${this.token}`,
            ...(json ? { 'content-type': 'application/json' } : {}),
        };
    }

    private async expectOk(response: Response, action: string): Promise<void> {
        if (response.ok) return;
        const detail = await response.text().catch(() => '');
        throw new Error(`${action} 失败（${response.status}）：${detail.slice(0, 300)}`);
    }

    async hello(): Promise<AgentHelloResult> {
        const response = await fetch(this.url('/hello'), { headers: this.headers(false) });
        await this.expectOk(response, '读取 Agent 能力');
        return (await response.json()) as AgentHelloResult;
    }

    async createRun(request: AgentCreateRunRequest): Promise<AgentCreateRunResult> {
        const response = await fetch(this.url('/runs'), {
            method: 'POST',
            headers: this.headers(true),
            body: JSON.stringify(request),
        });
        await this.expectOk(response, '创建 Agent 运行');
        return (await response.json()) as AgentCreateRunResult;
    }

    async cancelRun(runId: string): Promise<void> {
        const response = await fetch(this.url(`/runs/${encodeURIComponent(runId)}/cancel`), {
            method: 'POST',
            headers: this.headers(true),
        });
        await this.expectOk(response, '取消 Agent 运行');
    }

    async submitToolResult(runId: string, result: AgentToolResultRequest): Promise<void> {
        const response = await fetch(this.url(`/runs/${encodeURIComponent(runId)}/tool-results`), {
            method: 'POST',
            headers: this.headers(true),
            body: JSON.stringify(result),
        });
        await this.expectOk(response, '回填工具结果');
    }

    /** 订阅运行事件，直到收到终态事件或调用方中止。 */
    async streamEvents(
        runId: string,
        onEvent: (event: AgentRunEvent) => void,
        signal: AbortSignal,
    ): Promise<void> {
        const response = await fetch(this.url(`/runs/${encodeURIComponent(runId)}/events`), {
            headers: this.headers(false),
            signal,
        });
        await this.expectOk(response, '订阅 Agent 事件');
        if (!response.body) throw new Error('Agent 事件流缺少响应体');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        for (;;) {
            const chunk = await reader.read();
            if (chunk.done) return;
            buffer += decoder.decode(chunk.value, { stream: true });

            let split = buffer.indexOf('\n\n');
            while (split !== -1) {
                const frame = buffer.slice(0, split);
                buffer = buffer.slice(split + 2);
                split = buffer.indexOf('\n\n');
                if (!frame.startsWith('data:')) continue;

                const payload = frame.slice(5).trim();
                if (!payload) continue;

                const event = JSON.parse(payload) as AgentRunEvent;
                onEvent(event);
                if (event.type === 'run.finished' || event.type === 'run.error') {
                    await reader.cancel();
                    return;
                }
            }
        }
    }
}
