#!/usr/bin/env node
/**
 * MCP stdio ↔ HTTP 垫片。
 *
 * 只支持 stdio 的客户端（Claude Desktop 等）通过它接入应用内的 MCP 服务器：
 *
 *   { "command": "node", "args": ["<repo>/scripts/mcp-stdio.mjs"] }
 *
 * 行为：
 * - stdin 逐行读 JSON-RPC（MCP stdio 传输是换行分隔的 JSON），转发到端点文件里的 HTTP
 *   地址，再把应答逐行写回 stdout；
 * - **stdout 只写 JSON-RPC**，所有诊断信息走 stderr——stdout 混入日志会直接破坏协议；
 * - token 每次应用启动都会轮换，所以遇到 401/403 会重读端点文件重试一次，而不是要求
 *   客户端重启；
 * - 应用没在运行时，对请求回 JSON-RPC 错误（通知则不回），让客户端能显示原因。
 *
 * 用法：
 *   node scripts/mcp-stdio.mjs                      # 读 ./mcp-endpoint.json
 *   node scripts/mcp-stdio.mjs --endpoint <path>
 *   MCP_ENDPOINT_FILE=<path> node scripts/mcp-stdio.mjs
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = new Map(
    process.argv.slice(2).map((raw) => {
        const [key, ...rest] = raw.replace(/^--/, '').split('=');
        return [key, rest.join('=')];
    }),
);

const endpointPath =
    args.get('endpoint') ||
    process.env.MCP_ENDPOINT_FILE ||
    path.join(process.cwd(), 'mcp-endpoint.json');

const log = (...parts) => console.error('[mcp-stdio]', ...parts);

function readEndpoint() {
    let raw;
    try {
        raw = readFileSync(endpointPath, 'utf8');
    } catch {
        throw new Error(`读不到端点文件：${endpointPath}（应用是否在运行？）`);
    }
    const info = JSON.parse(raw);
    if (typeof info.url !== 'string' || typeof info.token !== 'string') {
        throw new Error('端点文件缺少 url 或 token');
    }
    return info;
}

let cachedEndpoint = null;

function endpoint() {
    if (!cachedEndpoint) cachedEndpoint = readEndpoint();
    return cachedEndpoint;
}

function errorFor(message, text) {
    // 通知不该有应答。
    if (!message || typeof message !== 'object' || !('id' in message)) return null;
    return {
        jsonrpc: '2.0',
        id: typeof message.id === 'string' || typeof message.id === 'number' ? message.id : null,
        error: { code: -32603, message: text },
    };
}

async function post(info, message) {
    return fetch(info.url, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            accept: 'application/json, text/event-stream',
            authorization: `Bearer ${info.token}`,
        },
        body: JSON.stringify(message),
    });
}

/** 转发一条消息；返回应答（通知返回 null）。 */
async function forward(message) {
    let response;
    try {
        response = await post(endpoint(), message);
        if (response.status === 401 || response.status === 403) {
            // token 轮换（应用重启过）：重读端点文件重试一次。
            log('凭据已失效，重读端点文件');
            cachedEndpoint = null;
            response = await post(endpoint(), message);
        }
    } catch (error) {
        return errorFor(message, `无法连接 MCP 服务器：${String(error)}`);
    }

    if (response.status === 202) return null;
    if (!response.ok) {
        return errorFor(message, `MCP 服务器返回 HTTP ${response.status}`);
    }
    const text = await response.text();
    if (!text.trim()) return null;
    try {
        return JSON.parse(text);
    } catch {
        return errorFor(message, 'MCP 服务器返回了无法解析的响应');
    }
}

function writeOut(payload) {
    process.stdout.write(`${JSON.stringify(payload)}\n`);
}

/** 串行处理，保持请求顺序；响应本身靠 id 关联。 */
let queue = Promise.resolve();

function enqueue(line) {
    const trimmed = line.trim();
    if (!trimmed) return;
    queue = queue
        .then(async () => {
            let message;
            try {
                message = JSON.parse(trimmed);
            } catch {
                writeOut({
                    jsonrpc: '2.0',
                    id: null,
                    error: { code: -32700, message: '无法解析请求' },
                });
                return;
            }
            const response = await forward(message);
            if (response) writeOut(response);
        })
        .catch((error) => {
            log('处理消息失败', error);
        });
}

// 启动就校验端点文件：读不到直接退出，客户端会显示这行 stderr。
try {
    endpoint();
    log(`已连接 ${endpointPath}`);
} catch (error) {
    log(String(error instanceof Error ? error.message : error));
    process.exit(1);
}

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
    buffer += chunk;
    let index = buffer.indexOf('\n');
    while (index >= 0) {
        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 1);
        enqueue(line);
        index = buffer.indexOf('\n');
    }
});
process.stdin.on('end', () => {
    if (buffer.trim()) enqueue(buffer);
    void queue.then(() => process.exit(0));
});
