import type {
    CapabilityDescriptor,
    CapabilityJsonSchema,
} from '../../src/shared/capabilities/types';

/**
 * MCP 的 JSON-RPC 语义（**纯逻辑**：不碰网络、不碰 electron，便于单测）。
 *
 * 只实现 tools 能力所需的子集：
 * `initialize` / `notifications/initialized` / `ping` / `tools/list` / `tools/call`。
 *
 * 两条刻意的约定：
 * - **工具执行失败不是协议错误**：返回 `result.isError = true`，让调用方的模型能读到
 *   失败原因并自行决定下一步；只有"请求本身不合法"才用 JSON-RPC error。
 * - **描述照搬能力契约**：`CapabilityDescriptor` 与 MCP 工具定义同形，不改字段名，
 *   避免两边悄悄漂移。
 */
export const LATEST_PROTOCOL_VERSION = '2025-06-18';

const SUPPORTED_PROTOCOL_VERSIONS = new Set([LATEST_PROTOCOL_VERSION, '2025-03-26', '2024-11-05']);

export const SERVER_NAME = 'goldenr';
export const SERVER_VERSION = '0.1.0';

export const JSON_RPC_ERRORS = {
    parse: -32700,
    invalidRequest: -32600,
    methodNotFound: -32601,
    invalidParams: -32602,
} as const;

/** MCP 工具定义；字段与 `CapabilityDescriptor` 一一对应。 */
export interface McpTool {
    name: string;
    description: string;
    inputSchema: CapabilityJsonSchema;
}

export interface JsonRpcSuccess {
    jsonrpc: '2.0';
    id: string | number | null;
    result: unknown;
}

export interface JsonRpcFailure {
    jsonrpc: '2.0';
    id: string | number | null;
    error: { code: number; message: string };
}

export type JsonRpcResponse = JsonRpcSuccess | JsonRpcFailure;

export interface McpHandlerDeps {
    /** 当前可用工具。由渲染层推送的能力清单生成。 */
    listTools: () => McpTool[];
    /** 执行一次能力调用；失败时抛错（由本层转成 isError 结果）。 */
    invoke: (name: string, args: Record<string, unknown>) => Promise<unknown>;
}

/** 能力描述 → MCP 工具。显式化这一层，让"两边同形"成为被测试保证的事实。 */
export function toMcpTool(descriptor: CapabilityDescriptor): McpTool {
    return {
        name: descriptor.name,
        description: descriptor.description,
        inputSchema: descriptor.inputSchema,
    };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function success(id: string | number | null, result: unknown): JsonRpcSuccess {
    return { jsonrpc: '2.0', id, result };
}

function failure(id: string | number | null, code: number, message: string): JsonRpcFailure {
    return { jsonrpc: '2.0', id, error: { code, message } };
}

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** 结果转文本；非可序列化值退化为字符串，而不是抛错。 */
function stringify(value: unknown): string {
    if (typeof value === 'string') return value;
    try {
        return JSON.stringify(value, null, 2) ?? String(value);
    } catch {
        return String(value);
    }
}

function negotiateProtocolVersion(params: unknown): string {
    const requested = isRecord(params) ? params.protocolVersion : undefined;
    return typeof requested === 'string' && SUPPORTED_PROTOCOL_VERSIONS.has(requested)
        ? requested
        : LATEST_PROTOCOL_VERSION;
}

async function callTool(
    id: string | number | null,
    params: unknown,
    deps: McpHandlerDeps,
): Promise<JsonRpcResponse> {
    if (!isRecord(params) || typeof params.name !== 'string' || !params.name) {
        return failure(id, JSON_RPC_ERRORS.invalidParams, 'tools/call 需要字符串参数 name');
    }
    const name = params.name;
    if (!deps.listTools().some((tool) => tool.name === name)) {
        // 工具不存在属于"请求不合法"，与"工具执行失败"是两回事。
        return failure(id, JSON_RPC_ERRORS.invalidParams, `未知工具：${name}`);
    }
    const args = isRecord(params.arguments) ? params.arguments : {};
    try {
        const result = await deps.invoke(name, args);
        return success(id, {
            content: [{ type: 'text', text: stringify(result) }],
            isError: false,
        });
    } catch (error) {
        return success(id, {
            content: [{ type: 'text', text: messageOf(error) }],
            isError: true,
        });
    }
}

/**
 * 处理一条 JSON-RPC 消息。
 *
 * @returns 请求返回应答；通知（无 `id`）返回 `null`，表示不该有应答。
 */
export async function handleMcpMessage(
    message: unknown,
    deps: McpHandlerDeps,
): Promise<JsonRpcResponse | null> {
    if (!isRecord(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
        return failure(null, JSON_RPC_ERRORS.invalidRequest, '不是合法的 JSON-RPC 2.0 请求');
    }
    // 通知不该有应答；未知通知同样静默忽略。
    if (!('id' in message)) return null;

    const id = typeof message.id === 'string' || typeof message.id === 'number' ? message.id : null;
    switch (message.method) {
        case 'initialize':
            return success(id, {
                protocolVersion: negotiateProtocolVersion(message.params),
                capabilities: { tools: { listChanged: true } },
                serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
            });
        case 'ping':
            return success(id, {});
        case 'tools/list':
            return success(id, { tools: deps.listTools() });
        case 'tools/call':
            return await callTool(id, message.params, deps);
        default:
            return failure(id, JSON_RPC_ERRORS.methodNotFound, `未支持的方法：${message.method}`);
    }
}
