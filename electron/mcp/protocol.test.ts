import { describe, expect, it, vi } from 'vitest';
import type { CapabilityDescriptor } from '../../src/shared/capabilities/types';
import {
    JSON_RPC_ERRORS,
    LATEST_PROTOCOL_VERSION,
    SERVER_NAME,
    handleMcpMessage,
    toMcpTool,
    type McpTool,
} from './protocol';

const descriptor: CapabilityDescriptor = {
    name: 'automation_list_scenarios',
    description: '列出场景',
    inputSchema: { type: 'object', properties: {}, required: [], additionalProperties: false },
};

const tools: McpTool[] = [toMcpTool(descriptor)];

function deps(invoke: (name: string, args: Record<string, unknown>) => Promise<unknown> = vi.fn()) {
    return { listTools: () => tools, invoke };
}

describe('toMcpTool', () => {
    it('能力描述与 MCP 工具定义同形，不重命名字段', () => {
        expect(toMcpTool(descriptor)).toEqual({
            name: 'automation_list_scenarios',
            description: '列出场景',
            inputSchema: descriptor.inputSchema,
        });
    });
});

describe('handleMcpMessage 握手与发现', () => {
    it('initialize 回显受支持的协议版本并声明 tools 能力', async () => {
        const response = await handleMcpMessage(
            {
                jsonrpc: '2.0',
                id: 1,
                method: 'initialize',
                params: { protocolVersion: '2025-03-26' },
            },
            deps(),
        );

        expect(response).toEqual({
            jsonrpc: '2.0',
            id: 1,
            result: {
                protocolVersion: '2025-03-26',
                capabilities: { tools: { listChanged: true } },
                serverInfo: { name: SERVER_NAME, version: expect.any(String) as unknown as string },
            },
        });
    });

    it('客户端版本不受支持时回落到最新版本', async () => {
        const response = await handleMcpMessage(
            {
                jsonrpc: '2.0',
                id: 1,
                method: 'initialize',
                params: { protocolVersion: '1999-01-01' },
            },
            deps(),
        );
        expect(response).toMatchObject({ result: { protocolVersion: LATEST_PROTOCOL_VERSION } });
    });

    it('initialize 未带参数也能工作', async () => {
        const response = await handleMcpMessage(
            { jsonrpc: '2.0', id: 2, method: 'initialize' },
            deps(),
        );
        expect(response).toMatchObject({
            id: 2,
            result: { protocolVersion: LATEST_PROTOCOL_VERSION },
        });
    });

    it('tools/list 直接反映能力清单', async () => {
        const response = await handleMcpMessage(
            { jsonrpc: '2.0', id: 3, method: 'tools/list' },
            deps(),
        );
        expect(response).toEqual({ jsonrpc: '2.0', id: 3, result: { tools } });
    });

    it('ping 返回空结果', async () => {
        const response = await handleMcpMessage({ jsonrpc: '2.0', id: 4, method: 'ping' }, deps());
        expect(response).toEqual({ jsonrpc: '2.0', id: 4, result: {} });
    });
});

describe('handleMcpMessage 工具调用', () => {
    it('成功时把结果序列化为文本内容', async () => {
        const invoke = vi.fn(async () => [{ scenarioId: 's1' }]);
        const response = await handleMcpMessage(
            {
                jsonrpc: '2.0',
                id: 5,
                method: 'tools/call',
                params: { name: 'automation_list_scenarios', arguments: { a: 1 } },
            },
            deps(invoke),
        );

        expect(invoke).toHaveBeenCalledWith('automation_list_scenarios', { a: 1 });
        expect(response).toMatchObject({ id: 5, result: { isError: false } });
        const content = (response as { result: { content: { text: string }[] } }).result.content;
        expect(JSON.parse(content[0].text)).toEqual([{ scenarioId: 's1' }]);
    });

    it('字符串结果原样返回，不额外加引号', async () => {
        const response = await handleMcpMessage(
            { jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: descriptor.name } },
            deps(async () => 'pong'),
        );
        expect(response).toMatchObject({ result: { content: [{ type: 'text', text: 'pong' }] } });
    });

    it('执行失败是结果（isError），不是协议错误——模型要能读到原因', async () => {
        const response = await handleMcpMessage(
            { jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: descriptor.name } },
            deps(async () => {
                throw new Error('场景不存在：s1');
            }),
        );

        expect(response).toMatchObject({
            id: 7,
            result: { isError: true, content: [{ type: 'text', text: '场景不存在：s1' }] },
        });
        expect(response).not.toHaveProperty('error');
    });

    it('未知工具属于请求不合法', async () => {
        const response = await handleMcpMessage(
            { jsonrpc: '2.0', id: 8, method: 'tools/call', params: { name: 'nope' } },
            deps(),
        );
        expect(response).toMatchObject({ error: { code: JSON_RPC_ERRORS.invalidParams } });
    });

    it('缺少 name 属于请求不合法', async () => {
        const response = await handleMcpMessage(
            { jsonrpc: '2.0', id: 9, method: 'tools/call', params: {} },
            deps(),
        );
        expect(response).toMatchObject({ error: { code: JSON_RPC_ERRORS.invalidParams } });
    });

    it('arguments 缺失时按空对象处理', async () => {
        const invoke = vi.fn(async () => 'ok');
        await handleMcpMessage(
            { jsonrpc: '2.0', id: 10, method: 'tools/call', params: { name: descriptor.name } },
            deps(invoke),
        );
        expect(invoke).toHaveBeenCalledWith(descriptor.name, {});
    });

    it('结果不可序列化时降级为字符串，不抛错', async () => {
        const circular: Record<string, unknown> = {};
        circular.self = circular;
        const response = await handleMcpMessage(
            { jsonrpc: '2.0', id: 11, method: 'tools/call', params: { name: descriptor.name } },
            deps(async () => circular),
        );
        expect(response).toMatchObject({ result: { isError: false } });
    });
});

describe('handleMcpMessage 通知与错误', () => {
    it('通知不应答', async () => {
        const response = await handleMcpMessage(
            { jsonrpc: '2.0', method: 'notifications/initialized' },
            deps(),
        );
        expect(response).toBeNull();
    });

    it('未知通知同样静默忽略', async () => {
        const response = await handleMcpMessage({ jsonrpc: '2.0', method: 'whatever' }, deps());
        expect(response).toBeNull();
    });

    it('未知方法返回 methodNotFound', async () => {
        const response = await handleMcpMessage({ jsonrpc: '2.0', id: 12, method: 'x/y' }, deps());
        expect(response).toMatchObject({
            id: 12,
            error: { code: JSON_RPC_ERRORS.methodNotFound },
        });
    });

    it('非法消息返回 invalidRequest，且 id 为 null', async () => {
        for (const bad of [null, 'string', { jsonrpc: '1.0', id: 1, method: 'ping' }, { id: 1 }]) {
            const response = await handleMcpMessage(bad, deps());
            expect(response).toMatchObject({
                id: null,
                error: { code: JSON_RPC_ERRORS.invalidRequest },
            });
        }
    });
});
