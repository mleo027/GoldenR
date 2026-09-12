import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { app } from 'electron';
import type {
    AgentCreateRunRequest,
    AgentCreateRunResult,
    AgentRunEvent,
    AgentStatus,
    AgentToolResultRequest,
} from '../../../src/shared/agent/protocol';
import { AGENT_PROTOCOL_VERSION } from '../../../src/shared/agent/protocol';
import type { ElectronAppContext } from '../../ipc/types';
import { AgentHttpClient } from './agentClient';
import { readAgentGatewayConfig, resolveAgentGatewayKey } from './agentGateway';
import { resolveAgentEntry, resolveNodeExecutable } from './agentPaths';
import { AgentSidecarProcess } from './agentProcess';

export interface AgentEventPayload {
    runId: string;
    event: AgentRunEvent;
}

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Agent 能力的主进程门面。
 *
 * 职责边界：
 * - 托管 sidecar 进程并完成契约握手；
 * - 把渲染进程的请求转成 sidecar 的 HTTP 调用；
 * - 把 sidecar 的事件流转发给渲染进程；
 * - 工具的实际执行由渲染进程完成（场景数据与运行器都在那边）。
 *
 * 因此本类不解释业务语义，只保证契约与生命周期，便于 sidecar 整体替换。
 */
export class AgentService {
    private readonly ctx: ElectronAppContext;
    private sidecar?: AgentSidecarProcess;
    private client?: AgentHttpClient;
    private status: AgentStatus = { state: 'stopped' };
    private starting?: Promise<AgentStatus>;
    private readonly streams = new Map<string, AbortController>();
    private eventSink: (payload: AgentEventPayload) => void = () => {};

    constructor(ctx: ElectronAppContext) {
        this.ctx = ctx;
    }

    setEventSink(sink: (payload: AgentEventPayload) => void): void {
        this.eventSink = sink;
    }

    getStatus(): AgentStatus {
        return this.status;
    }

    async start(): Promise<AgentStatus> {
        if (this.status.state === 'ready') return this.status;
        if (this.starting) return this.starting;
        this.starting = this.doStart().finally(() => {
            this.starting = undefined;
        });
        return this.starting;
    }

    private async doStart(): Promise<AgentStatus> {
        this.status = { state: 'starting' };
        try {
            const gateway = readAgentGatewayConfig(this.ctx);
            const apiKey = resolveAgentGatewayKey(this.ctx);
            const moduleDir = path.dirname(fileURLToPath(import.meta.url));
            const token = randomUUID();

            const sidecar = new AgentSidecarProcess({
                entry: resolveAgentEntry({
                    isPackaged: app.isPackaged,
                    resourcesPath: process.resourcesPath,
                    moduleDir,
                    cwd: process.cwd(),
                }),
                nodeExecutable: resolveNodeExecutable({
                    isPackaged: app.isPackaged,
                    resourcesPath: process.resourcesPath,
                    env: process.env,
                }),
                token,
                env: {
                    gatewayUrl: gateway.baseUrl,
                    gatewayKey: apiKey,
                    model: gateway.model,
                },
                onExit: () => {
                    this.sidecar = undefined;
                    this.client = undefined;
                    if (this.status.state !== 'failed') this.status = { state: 'stopped' };
                },
            });

            const ready = await sidecar.start();
            if (ready.protocolVersion !== AGENT_PROTOCOL_VERSION) {
                sidecar.stop();
                throw new Error(
                    `Agent 契约版本不匹配：sidecar=${ready.protocolVersion}，应用期望=${AGENT_PROTOCOL_VERSION}。请同步升级 agent/ 目录。`,
                );
            }

            const client = new AgentHttpClient(ready.port, token);
            const hello = await client.hello();

            this.sidecar = sidecar;
            this.client = client;
            this.status = {
                state: 'ready',
                protocolVersion: hello.protocolVersion,
                agentVersion: hello.agentVersion,
                capabilities: hello.capabilities,
            };
        } catch (error) {
            this.status = { state: 'failed', error: messageOf(error) };
        }
        return this.status;
    }

    stop(): void {
        for (const controller of this.streams.values()) controller.abort();
        this.streams.clear();
        this.sidecar?.stop();
        this.sidecar = undefined;
        this.client = undefined;
        this.status = { state: 'stopped' };
    }

    /** 网关配置变更后需要重启，因为配置是启动时经环境变量注入的。 */
    restart(): void {
        this.stop();
    }

    async send(request: AgentCreateRunRequest): Promise<AgentCreateRunResult> {
        const client = await this.ensureClient();
        const created = await client.createRun(request);
        const controller = new AbortController();
        this.streams.set(created.runId, controller);

        void client
            .streamEvents(
                created.runId,
                (event) => {
                    this.eventSink({ runId: created.runId, event });
                    if (event.type === 'run.finished' || event.type === 'run.error') {
                        this.streams.delete(created.runId);
                    }
                },
                controller.signal,
            )
            .catch((error: unknown) => {
                this.streams.delete(created.runId);
                if (controller.signal.aborted) return;
                this.eventSink({
                    runId: created.runId,
                    event: { type: 'run.error', message: messageOf(error) },
                });
            });

        return created;
    }

    async cancel(runId: string): Promise<void> {
        this.streams.get(runId)?.abort();
        this.streams.delete(runId);
        await this.client?.cancelRun(runId).catch(() => undefined);
    }

    async submitToolResult(runId: string, result: AgentToolResultRequest): Promise<void> {
        await this.ensureClient().then((client) => client.submitToolResult(runId, result));
    }

    private async ensureClient(): Promise<AgentHttpClient> {
        const status = await this.start();
        if (status.state !== 'ready' || !this.client) {
            throw new Error(status.error ?? 'Agent 未能启动');
        }
        return this.client;
    }
}
