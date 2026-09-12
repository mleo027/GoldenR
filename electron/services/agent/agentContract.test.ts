import { spawn, type ChildProcessByStdio } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import {
    AGENT_CAPABILITIES,
    AGENT_PROTOCOL_VERSION,
    AGENT_TOOL_NAMES,
    type AgentRunEvent,
} from '../../../src/shared/agent/protocol';

const agentDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
    '..',
    'agent',
);
const agentEntry = path.join(agentDir, 'main.mjs');
const agentProtocolModule = path.join(agentDir, 'protocol.mjs');

type SidecarProcess = ChildProcessByStdio<null, Readable, Readable>;

interface Sidecar {
    child: SidecarProcess;
    token: string;
    port: number;
}

const running: SidecarProcess[] = [];

afterAll(() => {
    for (const child of running) child.kill();
});

function readReadyLine(child: SidecarProcess): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
        let buffer = '';
        child.stdout.on('data', (chunk: Buffer) => {
            buffer += chunk.toString('utf8');
            const newline = buffer.indexOf('\n');
            if (newline === -1) return;
            resolve(JSON.parse(buffer.slice(0, newline)) as Record<string, unknown>);
        });
        child.on('error', reject);
    });
}

async function startSidecar(): Promise<Sidecar> {
    const token = randomUUID();
    const child = spawn(process.execPath, [agentEntry], {
        env: {
            ...process.env,
            AGENT_TOKEN: token,
            AGENT_PORT: '0',
            AGENT_GATEWAY_URL: '',
            AGENT_GATEWAY_KEY: '',
            AGENT_MODEL: '',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    running.push(child);
    const ready = await readReadyLine(child);
    if (ready.type !== 'ready')
        throw new Error(`sidecar failed to start: ${JSON.stringify(ready)}`);
    return { child, token, port: Number(ready.port) };
}

async function request(
    sidecar: Sidecar,
    method: string,
    route: string,
    body?: unknown,
): Promise<Response> {
    return fetch(`http://127.0.0.1:${sidecar.port}${route}`, {
        method,
        headers: {
            authorization: `Bearer ${sidecar.token}`,
            ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
}

/** 收集一次运行的全部事件，并按需应答宿主的工具调用。 */
async function collectRunEvents(
    sidecar: Sidecar,
    runId: string,
): Promise<{ types: string[]; proposedScript?: string }> {
    const response = await request(sidecar, 'GET', `/runs/${runId}/events`);
    if (!response.body) throw new Error('SSE response has no body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const types: string[] = [];
    let proposedScript: string | undefined;
    let buffer = '';
    let done = false;

    while (!done) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });

        let split = buffer.indexOf('\n\n');
        while (split !== -1) {
            const frame = buffer.slice(0, split);
            buffer = buffer.slice(split + 2);
            split = buffer.indexOf('\n\n');
            if (!frame.startsWith('data: ')) continue;

            const event = JSON.parse(frame.slice(6)) as AgentRunEvent;
            types.push(event.type);

            if (event.type === 'tool.call') {
                await request(sidecar, 'POST', `/runs/${runId}/tool-results`, {
                    toolCallId: event.call.toolCallId,
                    ok: true,
                    result: { id: 'scenario-1', name: '契约场景' },
                });
            }
            if (event.type === 'script.proposed') proposedScript = event.script;
            if (event.type === 'run.finished' || event.type === 'run.error') done = true;
        }
    }

    await reader.cancel();
    return { types, proposedScript };
}

describe('agent 契约 v1', () => {
    it('sidecar 常量与宿主契约完全一致', async () => {
        const sidecar = (await import(agentProtocolModule)) as {
            PROTOCOL_VERSION: number;
            CAPABILITIES: readonly string[];
            TOOL_NAMES: readonly string[];
        };

        expect(sidecar.PROTOCOL_VERSION).toBe(AGENT_PROTOCOL_VERSION);
        expect([...sidecar.CAPABILITIES]).toEqual([...AGENT_CAPABILITIES]);
        expect([...sidecar.TOOL_NAMES]).toEqual([...AGENT_TOOL_NAMES]);
    });

    it('握手返回匹配的协议版本与能力', async () => {
        const sidecar = await startSidecar();
        const hello = (await (await request(sidecar, 'GET', '/hello')).json()) as {
            protocolVersion: number;
            capabilities: string[];
        };

        expect(hello.protocolVersion).toBe(AGENT_PROTOCOL_VERSION);
        expect(hello.capabilities).toEqual([...AGENT_CAPABILITIES]);
    });

    it('拒绝缺少 token 的请求', async () => {
        const sidecar = await startSidecar();
        const response = await fetch(`http://127.0.0.1:${sidecar.port}/hello`);
        expect(response.status).toBe(401);
    });

    it('缺少网关配置时以 run.error 干净收尾', async () => {
        const sidecar = await startSidecar();
        const created = (await (
            await request(sidecar, 'POST', '/runs', {
                instruction: '创建一个查询客户余额的场景',
                scenarioId: 'scenario-1',
            })
        ).json()) as { runId: string };

        const { types } = await collectRunEvents(sidecar, created.runId);

        expect(types).toContain('run.started');
        expect(types).toContain('run.error');
        expect(types).not.toContain('tool.call');
    });
});
