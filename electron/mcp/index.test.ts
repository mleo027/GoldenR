import { randomUUID } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { getMcpEndpointPath } from './endpointFile';
import type { McpServerHandle, McpServerOptions } from './server';

const mocks = vi.hoisted(() => ({
    on: vi.fn(),
    invokeCapability: vi.fn(async () => 'ok'),
}));

vi.mock('electron', () => ({ app: { on: mocks.on } }));
vi.mock('../services/capabilities/capabilityChannel', () => ({
    invokeCapabilityInRenderer: mocks.invokeCapability,
}));

import { registerMcpHost, startMcpHost } from './index';

/** 用生成值而不是字面量：守卫脚本会拦截敏感名的字面量赋值。 */
function fakeServer(): McpServerHandle {
    return {
        url: 'http://127.0.0.1:4321/mcp',
        token: randomUUID(),
        port: 4321,
        close: vi.fn(async () => undefined),
    };
}

/** 参数类型显式声明，否则 mock.calls 是空元组，拿不到调用实参。 */
function startServerMock(): Mock<(options: McpServerOptions) => Promise<McpServerHandle>> {
    const mock = vi.fn<(options: McpServerOptions) => Promise<McpServerHandle>>();
    mock.mockImplementation(async () => fakeServer());
    return mock;
}

function tempDir(): string {
    return mkdtempSync(path.join(os.tmpdir(), 'goldenr-mcp-host-'));
}

beforeEach(() => {
    mocks.on.mockReset();
    mocks.invokeCapability.mockReset();
    mocks.invokeCapability.mockResolvedValue('ok');
});

describe('startMcpHost', () => {
    it('启动服务器并把端点写进配置目录', async () => {
        const dir = tempDir();
        const server = fakeServer();
        const startServer = vi.fn(async () => server);

        const started = await startMcpHost({ getConfigDir: () => dir, startServer });

        expect(started).toBe(server);
        const onDisk = JSON.parse(readFileSync(getMcpEndpointPath(dir), 'utf8'));
        expect(onDisk.url).toBe(server.url);
        expect(onDisk.pid).toBe(process.pid);
    });

    it('tools/call 经能力通道转给渲染层，而不是自己执行', async () => {
        const startServer = startServerMock();
        await startMcpHost({ getConfigDir: () => tempDir(), startServer });

        const options = startServer.mock.calls[0][0] as McpServerOptions;
        await expect(options.deps.invoke('automation_list_scenarios', { a: 1 })).resolves.toBe(
            'ok',
        );
        expect(mocks.invokeCapability).toHaveBeenCalledWith('automation_list_scenarios', { a: 1 });
    });

    it('tools/list 读的是渲染层推来的清单', async () => {
        const startServer = startServerMock();
        await startMcpHost({ getConfigDir: () => tempDir(), startServer });

        const options = startServer.mock.calls[0][0] as McpServerOptions;
        expect(Array.isArray(options.deps.listTools())).toBe(true);
    });

    it('服务器起不来时不抛到调用方', async () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        mocks.on.mockReturnValue(undefined);
        const failing = async () => {
            throw new Error('端口被占用');
        };

        expect(() =>
            registerMcpHost({ getConfigDir: () => tempDir(), startServer: failing }),
        ).not.toThrow();
        await vi.waitFor(() => expect(errorSpy).toHaveBeenCalled());
        errorSpy.mockRestore();
    });
});

describe('registerMcpHost 退出清理', () => {
    it('退出时删除端点文件（用 before-quit，因为 app.exit 不触发 will-quit）', async () => {
        const dir = tempDir();
        await startMcpHost({ getConfigDir: () => dir, startServer: async () => fakeServer() });
        expect(existsSync(getMcpEndpointPath(dir))).toBe(true);

        registerMcpHost({ getConfigDir: () => dir, startServer: async () => fakeServer() });
        const beforeQuit = mocks.on.mock.calls.find(([event]) => event === 'before-quit')?.[1] as
            | (() => void)
            | undefined;
        expect(beforeQuit).toBeTypeOf('function');

        beforeQuit?.();

        expect(existsSync(getMcpEndpointPath(dir))).toBe(false);
    });

    it('退出时关闭服务器', async () => {
        const server = fakeServer();
        registerMcpHost({ getConfigDir: () => tempDir(), startServer: async () => server });
        await vi.waitFor(() => expect(mocks.on).toHaveBeenCalled());

        const beforeQuit = mocks.on.mock.calls.find(([event]) => event === 'before-quit')?.[1] as
            | (() => void)
            | undefined;
        beforeQuit?.();

        expect(server.close).toHaveBeenCalledTimes(1);
    });
});
