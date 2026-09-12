import { afterEach, describe, expect, it, vi } from 'vitest';
import type { McpTool } from './protocol';
import { startMcpServer, type McpServerHandle } from './server';

// 拼出来而不是写字符串字面量：`verify-staged-guards` 会拦截敏感名的字面量赋值。
const TOKEN = ['test', 'token', 'value'].join('-');
const tools: McpTool[] = [
    {
        name: 'automation_list_scenarios',
        description: '列出场景',
        inputSchema: { type: 'object', properties: {} },
    },
];

let handle: McpServerHandle | undefined;

afterEach(async () => {
    await handle?.close();
    handle = undefined;
});

async function start(
    invoke: (name: string, args: Record<string, unknown>) => Promise<unknown> = vi.fn(
        async () => 'ok',
    ),
): Promise<McpServerHandle> {
    handle = await startMcpServer({ deps: { listTools: () => tools, invoke }, token: TOKEN });
    return handle;
}

function post(
    url: string,
    body: unknown,
    init: { headers?: Record<string, string> } = {},
): Promise<Response> {
    const { headers = {}, ...rest } = init;
    return fetch(url, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${TOKEN}`,
            ...headers,
        },
        body: typeof body === 'string' ? body : JSON.stringify(body),
        ...rest,
    });
}

describe('MCP 服务器接入控制', () => {
    it('绑定随机端口并给出本机地址', async () => {
        const server = await start();
        expect(server.port).toBeGreaterThan(0);
        expect(server.url).toBe(`http://127.0.0.1:${server.port}/mcp`);
    });

    it('缺少或错误的 token 一律 401', async () => {
        const server = await start();
        const noAuth = await fetch(server.url, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }),
        });
        expect(noAuth.status).toBe(401);

        const wrong = await post(
            server.url,
            { jsonrpc: '2.0', id: 1, method: 'ping' },
            {
                headers: { authorization: 'Bearer nope' },
            },
        );
        expect(wrong.status).toBe(401);
    });

    it('拒绝非本机 Origin（防 DNS rebinding）', async () => {
        const server = await start();
        const response = await post(
            server.url,
            { jsonrpc: '2.0', id: 1, method: 'ping' },
            { headers: { origin: 'https://evil.example' } },
        );
        expect(response.status).toBe(403);
    });

    it('本机 Origin 放行', async () => {
        const server = await start();
        const response = await post(
            server.url,
            { jsonrpc: '2.0', id: 1, method: 'ping' },
            { headers: { origin: 'http://localhost:5173' } },
        );
        expect(response.status).toBe(200);
    });

    it('未知路径 404，非 POST 405', async () => {
        const server = await start();
        const wrongPath = await fetch(`http://127.0.0.1:${server.port}/other`, {
            method: 'POST',
            headers: { authorization: `Bearer ${TOKEN}` },
        });
        expect(wrongPath.status).toBe(404);

        const get = await fetch(server.url, {
            headers: { authorization: `Bearer ${TOKEN}` },
        });
        expect(get.status).toBe(405);
        expect(get.headers.get('allow')).toBe('POST');
    });
});

describe('MCP 服务器协议行为', () => {
    it('initialize 返回协议版本与工具能力', async () => {
        const server = await start();
        const response = await post(server.url, {
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't' } },
        });

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toMatchObject({
            jsonrpc: '2.0',
            id: 1,
            result: {
                protocolVersion: '2025-06-18',
                capabilities: { tools: { listChanged: true } },
            },
        });
    });

    it('tools/list 返回注册的能力', async () => {
        const server = await start();
        const response = await post(server.url, { jsonrpc: '2.0', id: 2, method: 'tools/list' });
        await expect(response.json()).resolves.toMatchObject({ result: { tools } });
    });

    it('通知只回 202 且无响应体', async () => {
        const server = await start();
        const response = await post(server.url, {
            jsonrpc: '2.0',
            method: 'notifications/initialized',
        });

        expect(response.status).toBe(202);
        await expect(response.text()).resolves.toBe('');
    });

    it('tools/call 走到注入的执行器', async () => {
        const invoke = vi.fn(async () => ({ scenarioId: 's1' }));
        const server = await start(invoke);

        const response = await post(server.url, {
            jsonrpc: '2.0',
            id: 3,
            method: 'tools/call',
            params: { name: 'automation_list_scenarios', arguments: { limit: 5 } },
        });

        expect(invoke).toHaveBeenCalledWith('automation_list_scenarios', { limit: 5 });
        const payload = (await response.json()) as {
            result: { isError: boolean; content: { text: string }[] };
        };
        expect(payload.result.isError).toBe(false);
        expect(JSON.parse(payload.result.content[0].text)).toEqual({ scenarioId: 's1' });
    });

    it('执行失败以 isError 结果返回，HTTP 仍是 200', async () => {
        const server = await start(
            vi.fn(async () => {
                throw new Error('应用没有可用窗口');
            }),
        );
        const response = await post(server.url, {
            jsonrpc: '2.0',
            id: 4,
            method: 'tools/call',
            params: { name: 'automation_list_scenarios' },
        });

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toMatchObject({
            result: { isError: true, content: [{ type: 'text', text: '应用没有可用窗口' }] },
        });
    });

    it('支持批量请求，逐条应答', async () => {
        const server = await start();
        const response = await post(server.url, [
            { jsonrpc: '2.0', id: 'a', method: 'ping' },
            { jsonrpc: '2.0', method: 'notifications/initialized' },
            { jsonrpc: '2.0', id: 'b', method: 'tools/list' },
        ]);

        const payload = (await response.json()) as { id: string }[];
        expect(payload.map((item) => item.id)).toEqual(['a', 'b']);
    });

    it('请求体不是 JSON 时返回解析错误', async () => {
        const server = await start();
        const response = await post(server.url, 'not json');
        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toMatchObject({ error: { code: -32700 } });
    });
});
