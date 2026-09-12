#!/usr/bin/env node
/**
 * MCP 端到端冒烟：对着**正在运行的应用**跑一遍标准流程。
 *
 * 用法：
 *   node scripts/mcp-smoke.mjs                      # 读 ./mcp-endpoint.json（开发模式下配置目录即仓库根）
 *   node scripts/mcp-smoke.mjs --endpoint <path>    # 指定端点文件（安装版在 userData）
 *   MCP_ENDPOINT_FILE=<path> node scripts/mcp-smoke.mjs
 *
 * 流程：initialize → notifications/initialized → tools/list → tools/call（一个只读能力）。
 * 任一步失败以非 0 退出。
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

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

function fail(message) {
    console.error(`[mcp-smoke] ✗ ${message}`);
    process.exit(1);
}

function readEndpoint() {
    let raw;
    try {
        raw = readFileSync(endpointPath, 'utf8');
    } catch {
        fail(`读不到端点文件：${endpointPath}\n  应用是否在运行？开发模式下它写在仓库根目录。`);
    }
    let info;
    try {
        info = JSON.parse(raw);
    } catch (error) {
        fail(`端点文件不是合法 JSON：${String(error)}`);
    }
    if (typeof info.url !== 'string' || typeof info.token !== 'string') {
        fail('端点文件缺少 url 或 token');
    }
    return info;
}

const endpoint = readEndpoint();

// 崩溃后残留的端点文件会指向一个已死的端口，先给出明确提示而不是含糊的网络错误。
if (typeof endpoint.pid === 'number' && endpoint.pid !== process.pid) {
    try {
        process.kill(endpoint.pid, 0);
    } catch {
        fail(`端点文件已过期：进程 ${endpoint.pid} 不存在（应用崩溃过？删掉该文件并重启应用）`);
    }
}

let nextId = 1;
async function rpc(method, params) {
    const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            accept: 'application/json, text/event-stream',
            authorization: `Bearer ${endpoint.token}`,
        },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: nextId++,
            method,
            ...(params ? { params } : {}),
        }),
    });
    if (!response.ok) {
        fail(`${method} 返回 HTTP ${response.status}`);
    }
    const payload = await response.json();
    if (payload.error) {
        fail(`${method} 返回 JSON-RPC 错误 ${payload.error.code}：${payload.error.message}`);
    }
    return payload.result;
}

async function notify(method, params) {
    await fetch(endpoint.url, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${endpoint.token}`,
        },
        body: JSON.stringify({ jsonrpc: '2.0', method, ...(params ? { params } : {}) }),
    });
}

const init = await rpc('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'goldenr-mcp-smoke', version: '0.1.0' },
});
console.log(
    `[mcp-smoke] ✓ initialize：${init.serverInfo?.name} ${init.serverInfo?.version}（协议 ${init.protocolVersion}）`,
);

await notify('notifications/initialized');
console.log('[mcp-smoke] ✓ notifications/initialized');

const listed = await rpc('tools/list');
const tools = listed.tools ?? [];
if (tools.length === 0) {
    fail('tools/list 为空：渲染层是否已经把能力清单推上来？');
}
console.log(`[mcp-smoke] ✓ tools/list：${tools.length} 个工具`);
for (const tool of tools) {
    console.log(`    - ${tool.name}`);
}

// 只调只读能力，避免冒烟脚本改动用户数据。
const readOnly = tools.find((tool) => tool.name.endsWith('_list_scenarios')) ?? tools[0];
const called = await rpc('tools/call', { name: readOnly.name, arguments: {} });
const text = called.content?.[0]?.text ?? '';
if (called.isError) {
    fail(`tools/call ${readOnly.name} 失败：${text}`);
}
console.log(`[mcp-smoke] ✓ tools/call ${readOnly.name}：${text.slice(0, 200)}`);
console.log('[mcp-smoke] 通过');
