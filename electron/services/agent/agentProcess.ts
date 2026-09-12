import { spawn, type ChildProcess } from 'node:child_process';
import type { AgentStartupLine } from '../../../src/shared/agent/protocol';

/** sidecar 就绪超时。冷启动需要加载 sidecar 依赖，给足余量。 */
const READY_TIMEOUT_MS = 20_000;

/** 保留的 stderr 行数，用于失败时给出可诊断信息。 */
const MAX_STDERR_LINES = 20;

export interface AgentSidecarReady {
    port: number;
    protocolVersion: number;
    agentVersion: string;
}

export interface AgentSidecarOptions {
    entry: string;
    nodeExecutable: string;
    token: string;
    env: {
        gatewayUrl: string;
        gatewayKey: string;
        model: string;
    };
    onExit?: (info: { code: number | null; signal: NodeJS.Signals | null }) => void;
}

function parseStartupLine(line: string): AgentStartupLine | undefined {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{')) return undefined;
    try {
        return JSON.parse(trimmed) as AgentStartupLine;
    } catch {
        return undefined;
    }
}

/**
 * 托管 Agent sidecar 进程。
 *
 * 只负责生命周期与就绪握手：端口由 sidecar 自行选择并通过 stdout 上报，
 * 避免主进程预选端口时的竞态。契约版本不匹配时明确失败，不静默降级。
 */
export class AgentSidecarProcess {
    private readonly options: AgentSidecarOptions;
    private child?: ChildProcess;
    private ready?: AgentSidecarReady;
    private stderrLines: string[] = [];

    constructor(options: AgentSidecarOptions) {
        this.options = options;
    }

    get info(): AgentSidecarReady | undefined {
        return this.ready;
    }

    get isRunning(): boolean {
        return Boolean(this.child) && !this.child?.killed;
    }

    get recentStderr(): string {
        return this.stderrLines.join('\n');
    }

    async start(): Promise<AgentSidecarReady> {
        if (this.ready) return this.ready;

        const { env } = this.options;
        const child = spawn(this.options.nodeExecutable, [this.options.entry], {
            env: {
                ...process.env,
                AGENT_TOKEN: this.options.token,
                AGENT_PORT: '0',
                AGENT_GATEWAY_URL: env.gatewayUrl,
                AGENT_GATEWAY_KEY: env.gatewayKey,
                AGENT_MODEL: env.model,
            },
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        this.child = child;
        this.stderrLines = [];

        child.stderr?.on('data', (chunk: Buffer) => {
            const lines = chunk.toString('utf8').split('\n').filter(Boolean);
            this.stderrLines = [...this.stderrLines, ...lines].slice(-MAX_STDERR_LINES);
        });

        child.on('exit', (code, signal) => {
            this.child = undefined;
            this.ready = undefined;
            this.options.onExit?.({ code, signal });
        });

        this.ready = await this.waitForReady(child);
        return this.ready;
    }

    stop(): void {
        const child = this.child;
        this.child = undefined;
        this.ready = undefined;
        if (!child || child.killed) return;
        child.kill();
    }

    private waitForReady(child: ChildProcess): Promise<AgentSidecarReady> {
        return new Promise((resolve, reject) => {
            let buffer = '';
            const timer = setTimeout(() => {
                finish();
                child.kill();
                reject(new Error(`Agent sidecar 启动超时（${READY_TIMEOUT_MS}ms）`));
            }, READY_TIMEOUT_MS);

            const onData = (chunk: Buffer) => {
                buffer += chunk.toString('utf8');
                let newline = buffer.indexOf('\n');
                while (newline !== -1) {
                    const line = buffer.slice(0, newline);
                    buffer = buffer.slice(newline + 1);
                    const parsed = parseStartupLine(line);
                    if (parsed?.type === 'error') {
                        finish();
                        child.kill();
                        reject(new Error(`Agent sidecar 启动失败：${parsed.message}`));
                        return;
                    }
                    if (parsed?.type === 'ready') {
                        finish();
                        resolve({
                            port: parsed.port,
                            protocolVersion: parsed.protocolVersion,
                            agentVersion: parsed.agentVersion,
                        });
                        return;
                    }
                    newline = buffer.indexOf('\n');
                }
            };

            const onExit = (code: number | null) => {
                finish();
                reject(
                    new Error(
                        `Agent sidecar 提前退出（code=${String(code)}）：${this.recentStderr || '无 stderr 输出'}`,
                    ),
                );
            };

            const finish = () => {
                clearTimeout(timer);
                child.stdout?.off('data', onData);
                child.off('exit', onExit);
            };

            child.stdout?.on('data', onData);
            child.on('exit', onExit);
        });
    }
}
