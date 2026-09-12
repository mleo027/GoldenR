/**
 * sidecar 端到端自检：不依赖 vitest、不依赖主仓库。
 *
 * 验证：启动 → 握手 → 建运行 → 订阅 SSE → 应答工具调用 → 收到脚本提案 → 正常结束。
 * 用法：node agent/smoke.mjs
 */
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const token = randomUUID();
const TIMEOUT_MS = 8000;

const child = spawn(process.execPath, [path.join(here, 'main.mjs')], {
    env: { ...process.env, AGENT_TOKEN: token, AGENT_PORT: '0' },
    stdio: ['ignore', 'pipe', 'inherit'],
});

const fail = (message) => {
    child.kill();
    process.stderr.write(`smoke failed: ${message}\n`);
    process.exit(1);
};

const timer = setTimeout(() => fail('timeout'), TIMEOUT_MS);
timer.unref();

function readReady() {
    return new Promise((resolve) => {
        let buffer = '';
        child.stdout.on('data', (chunk) => {
            buffer += chunk.toString('utf8');
            const newline = buffer.indexOf('\n');
            if (newline === -1) return;
            resolve(JSON.parse(buffer.slice(0, newline)));
        });
    });
}

async function call(port, method, route, body) {
    const response = await fetch(`http://127.0.0.1:${port}${route}`, {
        method,
        headers: {
            authorization: `Bearer ${token}`,
            ...(body ? { 'content-type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) throw new Error(`${method} ${route} → ${response.status}`);
    return response;
}

const seen = new Set();

async function consume(port, runId) {
    const response = await call(port, 'GET', `/runs/${runId}/events`);
    const decoder = new TextDecoder();
    let buffer = '';
    let finished = false;

    for await (const chunk of response.body) {
        buffer += decoder.decode(chunk, { stream: true });
        let split = buffer.indexOf('\n\n');
        while (split !== -1) {
            const frame = buffer.slice(0, split);
            buffer = buffer.slice(split + 2);
            split = buffer.indexOf('\n\n');
            if (!frame.startsWith('data: ')) continue;

            const event = JSON.parse(frame.slice(6));
            seen.add(event.type);

            if (event.type === 'tool.call') {
                await call(port, 'POST', `/runs/${runId}/tool-results`, {
                    toolCallId: event.call.toolCallId,
                    ok: true,
                    result: { id: 'demo-scenario', name: '冒烟场景' },
                });
            }
            if (event.type === 'run.finished' || event.type === 'run.error') finished = true;
        }
        if (finished) return;
    }
}

const ready = await readReady();
if (ready.type !== 'ready') fail(`expected ready line, got ${JSON.stringify(ready)}`);
const { port, protocolVersion, agentVersion } = ready;

const hello = await (await call(port, 'GET', '/hello')).json();
if (hello.protocolVersion !== protocolVersion) fail('protocol version mismatch in /hello');

const { runId } = await (await call(port, 'POST', '/runs', {
    instruction: '创建一个查询客户余额的场景',
    scenarioId: 'demo-scenario',
})).json();

await consume(port, runId);
clearTimeout(timer);
child.kill();

for (const required of ['run.started', 'tool.call', 'script.proposed', 'run.finished']) {
    if (!seen.has(required)) fail(`missing event: ${required}`);
}

process.stdout.write(
    `smoke ok: protocol=${protocolVersion} agent=${agentVersion} port=${port} events=${[...seen].join(',')}\n`,
);
