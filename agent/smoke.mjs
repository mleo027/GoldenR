/**
 * sidecar 端到端自检：不依赖 vitest、不依赖主仓库、不依赖真实网关。
 *
 * 自带一个 OpenAI 兼容的 mock 网关，验证完整链路：
 *   启动 → 握手 → 建运行 → 订阅 SSE → 模型要求工具 → 宿主回填
 *   → 模型提交脚本草稿 → 终态
 *
 * 用法：node agent/smoke.mjs
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const BEARER = randomUUID();
const GATEWAY_CREDENTIAL = randomUUID();
const TIMEOUT_MS = 15000;
const REQUIRED_EVENTS = ['run.started', 'tool.call', 'message.delta', 'script.proposed', 'run.finished'];

const fail = (message) => {
    child?.kill();
    gateway?.close();
    process.stderr.write(`smoke failed: ${message}\n`);
    process.exit(1);
};

const timer = setTimeout(() => fail('timeout'), TIMEOUT_MS);
timer.unref();

/** 模拟公司网关：先要工具，再交草稿，最后给结论。 */
function createGateway() {
    let calls = 0;
    return http.createServer((req, res) => {
        req.on('data', () => undefined);
        req.on('end', () => {
            calls += 1;
            res.writeHead(200, { 'content-type': 'text/event-stream' });
            const delta =
                calls === 1
                    ? {
                          tool_calls: [
                              {
                                  index: 0,
                                  id: 'call-read',
                                  function: {
                                      name: 'read_scenario',
                                      arguments: JSON.stringify({ scenarioId: 'demo-scenario' }),
                                  },
                              },
                          ],
                      }
                    : calls === 2
                      ? {
                            tool_calls: [
                                {
                                    index: 0,
                                    id: 'call-propose',
                                    function: {
                                        name: 'propose_script',
                                        arguments: JSON.stringify({
                                            scenarioId: 'demo-scenario',
                                            script: 'scenario({ inputs: {} }, async (t) => {});',
                                            summary: '冒烟草稿',
                                        }),
                                    },
                                },
                            ],
                        }
                      : { content: '已完成冒烟流程' };
            res.write(`data: ${JSON.stringify({ choices: [{ delta }] })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
        });
    });
}

const gateway = createGateway();
await new Promise((resolve) => gateway.listen(0, '127.0.0.1', resolve));
const gatewayPort = gateway.address().port;

const child = spawn(process.execPath, [path.join(here, 'main.mjs')], {
    env: {
        ...process.env,
        AGENT_TOKEN: BEARER,
        AGENT_PORT: '0',
        AGENT_GATEWAY_URL: `http://127.0.0.1:${gatewayPort}`,
        AGENT_GATEWAY_KEY: GATEWAY_CREDENTIAL,
        AGENT_MODEL: 'smoke-model',
    },
    stdio: ['ignore', 'pipe', 'inherit'],
});

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
            authorization: `Bearer ${BEARER}`,
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

const { runId } = await (
    await call(port, 'POST', '/runs', {
        instruction: '创建一个查询客户余额的场景',
        scenarioId: 'demo-scenario',
    })
).json();

await consume(port, runId);
clearTimeout(timer);
child.kill();
gateway.close();

for (const required of REQUIRED_EVENTS) {
    if (!seen.has(required)) fail(`missing event: ${required}`);
}

process.stdout.write(
    `smoke ok: protocol=${protocolVersion} agent=${agentVersion} port=${port} events=${[...seen].join(',')}\n`,
);
