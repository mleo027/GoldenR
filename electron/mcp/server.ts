import { randomBytes, timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { JSON_RPC_ERRORS, handleMcpMessage, type McpHandlerDeps } from './protocol';

/**
 * MCP Streamable HTTP 服务器（仅本机）。
 *
 * 安全姿态：
 * - 只绑 `127.0.0.1`，不接受非本机连接；
 * - 每次启动轮换 Bearer token，恒定时间比较；
 * - 带 `Origin` 的请求必须是本机来源（防 DNS rebinding）；
 * - 请求体上限 1 MiB。
 *
 * 只支持 POST 的请求/应答模式。本服务器不会主动推送，因此不提供 GET 的 SSE 流
 * （按规范返回 405）。
 */
const MAX_BODY_BYTES = 1024 * 1024;
const MCP_PATH = '/mcp';

export interface McpServerOptions {
    deps: McpHandlerDeps;
    host?: string;
    /** 省略或 0 表示由系统分配随机端口。 */
    port?: number;
    /** 仅用于测试注入。 */
    token?: string;
}

export interface McpServerHandle {
    url: string;
    token: string;
    port: number;
    close: () => Promise<void>;
}

function sendJson(response: ServerResponse, status: number, payload: unknown): void {
    const body = JSON.stringify(payload);
    response.writeHead(status, {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
    });
    response.end(body);
}

function safeEqual(left: string, right: string): boolean {
    const a = Buffer.from(left);
    const b = Buffer.from(right);
    return a.length === b.length && timingSafeEqual(a, b);
}

function isAuthorized(request: IncomingMessage, token: string): boolean {
    const header = request.headers.authorization;
    if (typeof header !== 'string' || !header.startsWith('Bearer ')) return false;
    return safeEqual(header.slice('Bearer '.length), token);
}

/** 本地服务的基本防护：无 Origin（原生客户端）或本机 Origin 才放行。 */
function isAllowedOrigin(request: IncomingMessage): boolean {
    const origin = request.headers.origin;
    if (typeof origin !== 'string') return true;
    try {
        const { hostname } = new URL(origin);
        return hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '::1';
    } catch {
        return false;
    }
}

function readBody(request: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        let size = 0;
        request.on('data', (chunk: Buffer) => {
            size += chunk.length;
            if (size > MAX_BODY_BYTES) {
                reject(new Error('请求体过大'));
                request.destroy();
                return;
            }
            chunks.push(chunk);
        });
        request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        request.on('error', reject);
    });
}

async function handlePost(
    request: IncomingMessage,
    response: ServerResponse,
    deps: McpHandlerDeps,
): Promise<void> {
    let parsed: unknown;
    try {
        parsed = JSON.parse(await readBody(request));
    } catch (error) {
        sendJson(response, 400, {
            jsonrpc: '2.0',
            id: null,
            error: { code: JSON_RPC_ERRORS.parse, message: `无法解析请求：${String(error)}` },
        });
        return;
    }

    // const + 类型守卫别名，让下面的 Array.isArray 判定能收窄 payload。
    const payload = parsed;
    const isBatch = Array.isArray(payload);
    const messages: unknown[] = isBatch ? payload : [payload];
    if (messages.length === 0) {
        sendJson(response, 400, {
            jsonrpc: '2.0',
            id: null,
            error: { code: JSON_RPC_ERRORS.invalidRequest, message: '空批次' },
        });
        return;
    }

    const responses = [];
    for (const message of messages) {
        const handled = await handleMcpMessage(message, deps);
        if (handled) responses.push(handled);
    }

    if (responses.length === 0) {
        // 全是通知：按规范回 202，且不应答。
        response.writeHead(202).end();
        return;
    }
    sendJson(response, 200, isBatch ? responses : responses[0]);
}

async function route(
    request: IncomingMessage,
    response: ServerResponse,
    deps: McpHandlerDeps,
    token: string,
): Promise<void> {
    const { pathname } = new URL(request.url ?? '/', 'http://127.0.0.1');
    if (pathname !== MCP_PATH) {
        sendJson(response, 404, { error: `未知路径：${pathname}` });
        return;
    }
    if (request.method !== 'POST') {
        response.writeHead(405, { allow: 'POST' }).end();
        return;
    }
    if (!isAllowedOrigin(request)) {
        sendJson(response, 403, { error: '拒绝非本机来源的请求' });
        return;
    }
    if (!isAuthorized(request, token)) {
        response.writeHead(401, { 'www-authenticate': 'Bearer' }).end();
        return;
    }
    await handlePost(request, response, deps);
}

export async function startMcpServer(options: McpServerOptions): Promise<McpServerHandle> {
    const host = options.host ?? '127.0.0.1';
    const token = options.token ?? randomBytes(32).toString('base64url');

    const server = createServer((request, response) => {
        void route(request, response, options.deps, token).catch((error: unknown) => {
            if (response.headersSent) {
                response.end();
                return;
            }
            sendJson(response, 500, { error: String(error) });
        });
    });

    await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(options.port ?? 0, host, () => resolve());
    });

    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    return {
        url: `http://${host}:${port}${MCP_PATH}`,
        token,
        port,
        close: () =>
            new Promise<void>((resolve) => {
                server.close(() => resolve());
            }),
    };
}
