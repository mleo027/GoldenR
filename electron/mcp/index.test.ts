import { randomUUID } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { McpAuditEntry } from '../../src/shared/mcp/types';
import type { ElectronAppContext } from '../app/context';
import { getMcpEndpointPath } from './endpointFile';
import type { McpServerHandle, McpServerOptions } from './server';

const mocks = vi.hoisted(() => ({
    on: vi.fn(),
    invokeCapability: vi.fn(),
    startServer: vi.fn(),
}));

vi.mock('electron', () => ({ app: { on: mocks.on } }));
vi.mock('../services/capabilities/capabilityChannel', () => ({
    invokeCapabilityInRenderer: mocks.invokeCapability,
}));
vi.mock('./server', () => ({ startMcpServer: mocks.startServer }));

import { applyMcpSettings, readMcpState, registerMcpHost, saveMcpSettings } from './index';
import { setCapabilityManifest } from './manifest';

type ServerMock = Mock<(options: McpServerOptions) => Promise<McpServerHandle>>;

function fakeServer(): McpServerHandle {
    return {
        url: 'http://127.0.0.1:5555/mcp',
        token: randomUUID(),
        port: 5555,
        close: vi.fn(async () => undefined),
    };
}

function startServerMock(): ServerMock {
    mocks.startServer.mockImplementation(async () => fakeServer());
    return mocks.startServer as unknown as ServerMock;
}

/** 内存版仓储：只实现 MCP 用到的那几个键。 */
function makeCtx(dir: string, onDisk = new Map<string, unknown>()): ElectronAppContext {
    return {
        getConfigDir: () => dir,
        configRepository: {
            readMcpSettings: () => onDisk.get('mcpSettings') ?? null,
            writeMcpSettings: (value: unknown) => void onDisk.set('mcpSettings', value),
            readMcpAudit: () => onDisk.get('mcpAudit') ?? null,
            writeMcpAudit: (value: unknown) => void onDisk.set('mcpAudit', value),
        },
    } as unknown as ElectronAppContext;
}

function tempDir(): string {
    return mkdtempSync(path.join(os.tmpdir(), 'goldenr-mcp-gov-'));
}

/** 取出传给 startMcpServer 的 deps，直接驱动调用以验证审计。 */
function capturedDeps(mock: ServerMock): McpServerOptions['deps'] {
    return mock.mock.calls[0][0].deps;
}

beforeEach(async () => {
    mocks.on.mockReset();
    mocks.invokeCapability.mockReset();
    mocks.invokeCapability.mockResolvedValue('ok');
    mocks.startServer.mockReset();
    setCapabilityManifest([]);
    // 模块级的服务器句柄会跨用例保留，先把上一次的停掉。
    await applyMcpSettings(makeCtx(tempDir(), new Map([['mcpSettings', { enabled: false }]])));
});

describe('MCP 开关', () => {
    it('默认关闭：服务器不启动，也没有端点文件', async () => {
        const dir = tempDir();
        const start = startServerMock();

        const state = await applyMcpSettings(makeCtx(dir));

        expect(state.enabled).toBe(false);
        expect(state.running).toBe(false);
        expect(start).not.toHaveBeenCalled();
        expect(existsSync(getMcpEndpointPath(dir))).toBe(false);
    });

    it('开启后启动服务器并写出端点文件', async () => {
        const dir = tempDir();
        const start = startServerMock();

        const state = await saveMcpSettings(makeCtx(dir), { enabled: true });

        expect(start).toHaveBeenCalledTimes(1);
        expect(state).toMatchObject({
            enabled: true,
            running: true,
            url: 'http://127.0.0.1:5555/mcp',
        });
        expect(existsSync(getMcpEndpointPath(dir))).toBe(true);
    });

    it('端点文件在磁盘上含凭据（因此必须被忽略）', async () => {
        const dir = tempDir();
        startServerMock();

        await saveMcpSettings(makeCtx(dir), { enabled: true });

        const onDisk = JSON.parse(readFileSync(getMcpEndpointPath(dir), 'utf8'));
        expect(typeof onDisk.token).toBe('string');
    });

    it('重复开启不会重复启动', async () => {
        const start = startServerMock();
        const ctx = makeCtx(tempDir());

        await saveMcpSettings(ctx, { enabled: true });
        await applyMcpSettings(ctx);

        expect(start).toHaveBeenCalledTimes(1);
    });

    it('关闭时停止服务器并删除端点文件', async () => {
        const dir = tempDir();
        const start = startServerMock();
        const ctx = makeCtx(dir);
        await saveMcpSettings(ctx, { enabled: true });
        const handle = await start.mock.results[0].value;

        const state = await saveMcpSettings(ctx, { enabled: false });

        expect(state.running).toBe(false);
        expect(existsSync(getMcpEndpointPath(dir))).toBe(false);
        expect(handle.close).toHaveBeenCalledTimes(1);
    });

    it('拒绝不合法的设置，且不改变现状', async () => {
        const start = startServerMock();
        const ctx = makeCtx(tempDir());

        await expect(saveMcpSettings(ctx, { enabled: '是' })).rejects.toThrowError(/enabled/);
        expect(start).not.toHaveBeenCalled();
    });
});

describe('MCP 状态与审计', () => {
    it('状态里没有凭据字段', async () => {
        startServerMock();
        const ctx = makeCtx(tempDir());
        await saveMcpSettings(ctx, { enabled: true });

        const state = readMcpState(ctx);

        expect(Object.keys(state)).not.toContain('token');
        expect(JSON.stringify(state)).not.toContain('Bearer');
    });

    it('能力数量来自渲染层推来的清单', () => {
        setCapabilityManifest([
            {
                name: 'automation_a',
                description: 'a',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'automation_b',
                description: 'b',
                inputSchema: { type: 'object', properties: {} },
            },
        ]);

        expect(readMcpState(makeCtx(tempDir())).toolCount).toBe(2);
    });

    it('成功调用会写审计（含命名空间与耗时）', async () => {
        const start = startServerMock();
        const ctx = makeCtx(tempDir());
        await saveMcpSettings(ctx, { enabled: true });

        await capturedDeps(start).invoke('automation_list_scenarios', { limit: 5 });

        const [entry] = readMcpState(ctx).audit;
        expect(entry).toMatchObject({
            namespace: 'automation',
            tool: 'automation_list_scenarios',
            ok: true,
        });
        expect(entry.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('失败调用也写审计并带上原因', async () => {
        const start = startServerMock();
        const ctx = makeCtx(tempDir());
        mocks.invokeCapability.mockRejectedValueOnce(new Error('场景不存在：s1'));
        await saveMcpSettings(ctx, { enabled: true });

        await expect(
            capturedDeps(start).invoke('automation_read_scenario', {}),
        ).rejects.toThrowError('场景不存在：s1');

        expect(readMcpState(ctx).audit[0]).toMatchObject({
            ok: false,
            error: '场景不存在：s1',
        });
    });

    it('审计只记参数名，不记取值——脚本内容不会落进日志', async () => {
        const start = startServerMock();
        const ctx = makeCtx(tempDir());
        await saveMcpSettings(ctx, { enabled: true });

        await capturedDeps(start).invoke('automation_write_scenario', {
            script: 'secret-sql-statement',
            name: '场景',
        });

        const state = readMcpState(ctx);
        expect(JSON.stringify(state.audit)).not.toContain('secret-sql-statement');
        expect(state.audit[0].argsSummary).toBe('name, script');
    });

    it('审计可跨重启读回，且单条损坏不影响其余', () => {
        const good: McpAuditEntry = {
            at: 1,
            namespace: 'automation',
            tool: 'automation_a',
            argsSummary: '(无参数)',
            ok: true,
            durationMs: 3,
        };
        const onDisk = new Map<string, unknown>([
            ['mcpAudit', { entries: [good, { broken: true }] }],
        ]);

        expect(readMcpState(makeCtx(tempDir(), onDisk)).audit).toEqual([good]);
    });
});

describe('registerMcpHost 生命周期', () => {
    it('退出时删除端点文件并关闭服务器', async () => {
        const dir = tempDir();
        const start = startServerMock();
        const ctx = makeCtx(dir);
        await saveMcpSettings(ctx, { enabled: true });
        const handle = await start.mock.results[0].value;

        registerMcpHost(ctx);
        const beforeQuit = mocks.on.mock.calls.find(([event]) => event === 'before-quit')?.[1] as
            | (() => void)
            | undefined;
        beforeQuit?.();

        expect(existsSync(getMcpEndpointPath(dir))).toBe(false);
        expect(handle.close).toHaveBeenCalled();
    });

    it('服务器起不来时不抛到调用方', async () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        mocks.startServer.mockRejectedValue(new Error('端口被占用'));
        const onDisk = new Map<string, unknown>([['mcpSettings', { enabled: true }]]);

        expect(() => registerMcpHost(makeCtx(tempDir(), onDisk))).not.toThrow();

        await vi.waitFor(() => expect(errorSpy).toHaveBeenCalled());
        errorSpy.mockRestore();
    });
});
