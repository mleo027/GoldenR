import { spawn, type ChildProcessByStdio } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import http from 'node:http';
import path from 'node:path';
import type { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import type { AgentRunEvent } from '../../../src/shared/agent/protocol';

const agentDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
    '..',
    'agent',
);
const agentEntry = path.join(agentDir, 'main.mjs');
const BEARER = randomUUID();

type SidecarProcess = ChildProcessByStdio<null, Readable, Readable>;

interface Sidecar {
    child: SidecarProcess;
    port: number;
}

const cleanups: Array<() => void> = [];

afterAll(() => {
    for (const cleanup of cleanups) cleanup();
});

/** 模拟公司网关：OpenAI 兼容的流式 /chat/completions。 */
function createMockGateway() {
    let calls = 0;
    const server = http.createServer((req, res) => {
        let body = '';
        req.on('data', (chunk) => {
            body += chunk;
        });
        req.on('end', () => {
            calls += 1;
            // 第二轮请求必须已经带上宿主回填的工具结果。
            if (calls === 2) expect(body).toContain('scenario-1');

            res.writeHead(200, { 'content-type': 'text/event-stream' });
            const send = (delta: unknown) =>
                res.write(`data: ${JSON.stringify({ choices: [{ delta }] })}\n\n`);

            if (calls === 1) {
                send({
                    tool_calls: [
                        {
                            index: 0,
                            id: 'call-1',
                            function: {
                                name: 'read_scenario',
                                arguments: JSON.stringify({ scenarioId: 'scenario-1' }),
                            },
                        },
                    ],
                });
            } else if (calls === 2) {
                send({
                    tool_calls: [
                        {
                            index: 0,
                            id: 'call-2',
                            function: {
                                name: 'propose_script',
                                arguments: JSON.stringify({
                                    scenarioId: 'scenario-1',
                                    script: 'scenario({ inputs: {} }, async (t) => {});',
                                    summary: '草稿',
                                }),
                            },
                        },
                    ],
                });
            } else {
                send({ content: '已完成' });
            }
            res.write('data: [DONE]\n\n');
            res.end();
        });
    });
    return server;
}

async function listen(server: http.Server): Promise<number> {
    await new Promise<void>((resolve) => {
        server.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address();
    if (!address || typeof address !== 'object') throw new Error('no port');
    cleanups.push(() => server.close());
    return address.port;
}

function startSidecar(gatewayUrl: string): Promise<Sidecar> {
    const child = spawn(process.execPath, [agentEntry], {
        env: {
            ...process.env,
            AGENT_TOKEN: BEARER,
            AGENT_PORT: '0',
            AGENT_GATEWAY_URL: gatewayUrl,
            AGENT_GATEWAY_KEY: 'test-key',
            AGENT_MODEL: 'mock-model',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    cleanups.push(() => child.kill());

    return new Promise((resolve, reject) => {
        let buffer = '';
        child.stdout.on('data', (chunk: Buffer) => {
            buffer += chunk.toString('utf8');
            const newline = buffer.indexOf('\n');
            if (newline === -1) return;
            const ready = JSON.parse(buffer.slice(0, newline)) as { type: string; port: number };
            if (ready.type !== 'ready') reject(new Error(`sidecar not ready: ${buffer}`));
            else resolve({ child, port: ready.port });
        });
        child.on('error', reject);
    });
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
            authorization: `Bearer ${BEARER}`,
            ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
}

describe('agent 引擎（真实工具调用循环）', () => {
    it('经模型工具调用完成读取、提案与收尾', async () => {
        const gatewayPort = await listen(createMockGateway());
        const sidecar = await startSidecar(`http://127.0.0.1:${gatewayPort}`);

        const created = (await (
            await request(sidecar, 'POST', '/runs', {
                instruction: '给场景加一个查询步骤',
                scenarioId: 'scenario-1',
            })
        ).json()) as { runId: string };

        const response = await request(sidecar, 'GET', `/runs/${created.runId}/events`);
        if (!response.body) throw new Error('no body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        const events: AgentRunEvent[] = [];
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
                events.push(event);

                if (event.type === 'tool.call') {
                    await request(sidecar, 'POST', `/runs/${created.runId}/tool-results`, {
                        toolCallId: event.call.toolCallId,
                        ok: true,
                        result: { id: 'scenario-1', name: '演示场景', script: 'scenario();' },
                    });
                }
                if (event.type === 'run.finished' || event.type === 'run.error') done = true;
            }
        }
        await reader.cancel();

        const types = events.map((event) => event.type);
        expect(types).toContain('tool.call');
        expect(types).toContain('message.delta');
        expect(types).toContain('script.proposed');
        expect(types).toContain('run.finished');
        expect(types).not.toContain('run.error');

        const proposed = events.find((event) => event.type === 'script.proposed');
        expect(proposed && 'script' in proposed ? proposed.script : '').toContain('scenario(');
    });
});
