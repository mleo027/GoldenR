/**
 * Agent sidecar 入口：把引擎暴露成受 token 保护的本地 HTTP 服务。
 *
 * 本文件属于紧邻契约的协议层，接入 Pi 时不需要改动；
 * 真正的可替换点在 `engine.mjs`。
 */
import http from 'node:http';
import { AGENT_VERSION, CAPABILITIES, PROTOCOL_VERSION } from './protocol.mjs';
import { createRunRegistry } from './runs.mjs';
import { run as runEngine } from './engine.mjs';

function fail(message) {
    process.stdout.write(`${JSON.stringify({ type: 'error', message })}\n`);
    process.exit(1);
}

const token = process.env.AGENT_TOKEN;
if (!token) fail('AGENT_TOKEN is required');

const requestedPort = Number(process.env.AGENT_PORT ?? 0);
const runs = createRunRegistry();

function authorized(req) {
    return req.headers.authorization === `Bearer ${token}`;
}

function sendJson(res, status, body) {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(body));
}

async function readJson(req) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    if (!chunks.length) return {};
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function messageOf(error) {
    return error instanceof Error ? error.message : String(error);
}

/** 启动一次运行，并在后台驱动引擎，事件经 SSE 流出。 */
function startRun(body) {
    if (typeof body?.instruction !== 'string' || !body.instruction.trim()) {
        throw new Error('instruction is required');
    }
    const runRecord = runs.create(body);
    runRecord.emit({ type: 'run.started', runId: runRecord.id });

    const tools = { call: (name, args) => runRecord.callTool(name, args) };
    const emit = (event) => runRecord.emit(event);

    void (async () => {
        try {
            const result = await runEngine({
                input: runRecord.input,
                tools,
                emit,
                isCancelled: () => runRecord.cancelled,
            });
            runRecord.emit({
                type: 'run.finished',
                status: result?.status ?? 'succeeded',
                summary: result?.summary,
            });
        } catch (error) {
            if (runRecord.cancelled) runRecord.emit({ type: 'run.finished', status: 'cancelled' });
            else runRecord.emit({ type: 'run.error', message: messageOf(error) });
        } finally {
            runRecord.finished = true;
        }
    })();

    return runRecord;
}

function streamEvents(req, res, runRecord) {
    res.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        connection: 'keep-alive',
    });
    const unsubscribe = runRecord.subscribe((event) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
    });
    req.on('close', unsubscribe);
}

async function handle(req, res) {
    if (!authorized(req)) return sendJson(res, 401, { error: 'unauthorized' });

    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    const segments = url.pathname.split('/').filter(Boolean);

    if (req.method === 'GET' && url.pathname === '/hello') {
        return sendJson(res, 200, {
            protocolVersion: PROTOCOL_VERSION,
            agentVersion: AGENT_VERSION,
            capabilities: CAPABILITIES,
        });
    }

    if (req.method === 'POST' && url.pathname === '/runs') {
        const runRecord = startRun(await readJson(req));
        return sendJson(res, 201, { runId: runRecord.id });
    }

    if (segments[0] === 'runs' && segments[1]) {
        const runRecord = runs.get(segments[1]);
        if (!runRecord) return sendJson(res, 404, { error: 'run not found' });

        if (req.method === 'GET' && segments[2] === 'events') {
            return streamEvents(req, res, runRecord);
        }
        if (req.method === 'POST' && segments[2] === 'tool-results') {
            const accepted = runRecord.resolveTool(await readJson(req));
            return sendJson(res, accepted ? 200 : 404, { ok: accepted });
        }
        if (req.method === 'POST' && segments[2] === 'cancel') {
            runRecord.cancel();
            return sendJson(res, 200, { ok: true });
        }
    }

    return sendJson(res, 404, { error: 'not found' });
}

const server = http.createServer((req, res) => {
    handle(req, res).catch((error) => sendJson(res, 500, { error: messageOf(error) }));
});

server.listen(requestedPort, '127.0.0.1', () => {
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : requestedPort;
    process.stdout.write(
        `${JSON.stringify({
            type: 'ready',
            protocolVersion: PROTOCOL_VERSION,
            agentVersion: AGENT_VERSION,
            port,
        })}\n`,
    );
});

server.on('error', (error) => fail(messageOf(error)));
