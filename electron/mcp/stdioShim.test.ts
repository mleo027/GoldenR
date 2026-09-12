import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { getMcpEndpointPath, writeMcpEndpointFile } from './endpointFile';
import { startMcpServer, type McpServerHandle } from './server';

let handle: McpServerHandle | undefined;
const children: ChildProcessWithoutNullStreams[] = [];

afterEach(async () => {
    for (const child of children.splice(0)) child.kill();
    await handle?.close();
    handle = undefined;
});

async function startServer(invoke: (name: string) => Promise<unknown> = async () => 'ok') {
    handle = await startMcpServer({
        deps: {
            listTools: () => [
                {
                    name: 'automation_list_scenarios',
                    description: '列出场景',
                    inputSchema: { type: 'object', properties: {} },
                },
            ],
            invoke: (name) => invoke(name),
        },
    });
    return handle;
}

function tempDir(): string {
    return mkdtempSync(path.join(os.tmpdir(), 'goldenr-stdio-'));
}

function startShim(endpointPath: string) {
    const child = spawn(process.execPath, ['scripts/mcp-stdio.mjs', `--endpoint=${endpointPath}`], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
    });
    children.push(child);
    const lines: string[] = [];
    let buffer = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
        buffer += chunk;
        let index = buffer.indexOf('\n');
        while (index >= 0) {
            const line = buffer.slice(0, index).trim();
            buffer = buffer.slice(index + 1);
            if (line) lines.push(line);
            index = buffer.indexOf('\n');
        }
    });
    let stderr = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => {
        stderr += chunk;
    });
    return {
        child,
        send: (message: unknown) => child.stdin.write(`${JSON.stringify(message)}\n`),
        responses: () => lines.map((line) => JSON.parse(line) as Record<string, unknown>),
        stderr: () => stderr,
    };
}

async function waitFor(check: () => boolean, timeoutMs = 10_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (!check() && Date.now() < deadline) {
        await new Promise((resolve) => {
            setTimeout(resolve, 20);
        });
    }
    if (!check()) throw new Error('等待 stdio 垫片响应超时');
}

describe('MCP stdio 垫片', () => {
    it('把 stdio 上的 JSON-RPC 转发到服务器并写回应答', async () => {
        const server = await startServer(async () => [{ scenarioId: 's1' }]);
        const dir = tempDir();
        writeMcpEndpointFile(dir, server);
        const shim = startShim(getMcpEndpointPath(dir));

        shim.send({
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't' } },
        });
        await waitFor(() => shim.responses().length >= 1);
        expect(shim.responses()[0]).toMatchObject({
            id: 1,
            result: { protocolVersion: '2025-06-18', serverInfo: { name: 'goldenr' } },
        });

        // 通知：不应产生任何 stdout 行（stdout 只能有 JSON-RPC）。
        shim.send({ jsonrpc: '2.0', method: 'notifications/initialized' });

        shim.send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
        await waitFor(() => shim.responses().length >= 2);
        expect(shim.responses()[1]).toMatchObject({
            id: 2,
            result: { tools: [{ name: 'automation_list_scenarios' }] },
        });

        shim.send({
            jsonrpc: '2.0',
            id: 3,
            method: 'tools/call',
            params: { name: 'automation_list_scenarios', arguments: {} },
        });
        await waitFor(() => shim.responses().length >= 3);
        const call = shim.responses()[2] as {
            result: { isError: boolean; content: { text: string }[] };
        };
        expect(call.result.isError).toBe(false);
        expect(JSON.parse(call.result.content[0].text)).toEqual([{ scenarioId: 's1' }]);
    });

    it('应用重启换了 token 后仍能用（重读端点文件重试）', async () => {
        const server = await startServer();
        const dir = tempDir();
        const file = getMcpEndpointPath(dir);

        writeMcpEndpointFile(dir, server);
        // 先写入一份过期凭据，模拟"应用重启过、token 已轮换"。
        const stale = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
        writeFileSync(file, JSON.stringify({ ...stale, token: ['stale', 'credential'].join('-') }));

        const shim = startShim(file);
        shim.send({ jsonrpc: '2.0', id: 1, method: 'ping' });
        await waitFor(() => shim.responses().length >= 1);
        expect(shim.responses()[0]).toMatchObject({ id: 1, error: { code: -32603 } });

        // 应用重新写入正确凭据后，同一个垫片进程应当自愈。
        writeMcpEndpointFile(dir, server);
        shim.send({ jsonrpc: '2.0', id: 2, method: 'ping' });
        await waitFor(() => shim.responses().length >= 2);
        expect(shim.responses()[1]).toEqual({ jsonrpc: '2.0', id: 2, result: {} });
    });

    it('端点文件不存在时立刻退出并在 stderr 说明原因', async () => {
        const missing = path.join(tempDir(), 'nope.json');
        const shim = startShim(missing);

        const code = await new Promise<number | null>((resolve) => {
            shim.child.on('exit', (value) => resolve(value));
        });

        expect(code).toBe(1);
        expect(shim.responses()).toEqual([]);
        expect(shim.stderr()).toContain('读不到端点文件');
    });
});
