import { app } from 'electron';
import type { McpState } from '../../src/shared/mcp/types';
import type { ElectronAppContext } from '../app/context';
import { invokeCapabilityInRenderer } from '../services/capabilities/capabilityChannel';
import { McpAuditLog, namespaceOf, summarizeArgs } from './audit';
import { removeMcpEndpointFile, writeMcpEndpointFile } from './endpointFile';
import { listMcpTools } from './manifest';
import { readMcpAudit, readMcpSettings, writeMcpAudit, writeMcpSettings } from './settings';
import { startMcpServer, type McpServerHandle } from './server';

/**
 * MCP 服务器的主进程生命周期与治理。
 *
 * 开关语义：**关闭 = 服务器不启动**，没有任何端口在监听——不是"监听着但拒绝调用"。
 * 这样"允许外部调用"就是一次真实的能力授予，而不是一层可绕过的判断。
 *
 * 服务器本身不认识任何业务语义：`tools/list` 读渲染层推来的清单，`tools/call` 转给
 * 渲染层执行，主进程只负责生命周期、开关与审计。
 */
let handle: McpServerHandle | undefined;
let audit: McpAuditLog | undefined;
let auditCtx: ElectronAppContext | undefined;

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** 审计绑定在特定 ctx 上；ctx 改变（正常运行时不会）就重建，避免写到旧的仓储。 */
function auditLog(ctx: ElectronAppContext): McpAuditLog {
    if (!audit || auditCtx !== ctx) {
        audit = new McpAuditLog((entries) => writeMcpAudit(ctx, entries));
        audit.hydrate(readMcpAudit(ctx));
        auditCtx = ctx;
    }
    return audit;
}

/** 记录一次调用：成功与失败都记，含耗时。参数只记名字。 */
async function invokeAudited(
    ctx: ElectronAppContext,
    name: string,
    args: Record<string, unknown>,
): Promise<unknown> {
    const started = Date.now();
    const base = {
        at: started,
        namespace: namespaceOf(name),
        tool: name,
        argsSummary: summarizeArgs(args),
    };
    try {
        const result = await invokeCapabilityInRenderer(name, args);
        auditLog(ctx).record({ ...base, ok: true, durationMs: Date.now() - started });
        return result;
    } catch (error) {
        auditLog(ctx).record({
            ...base,
            ok: false,
            durationMs: Date.now() - started,
            error: messageOf(error),
        });
        throw error;
    }
}

async function startHost(ctx: ElectronAppContext): Promise<void> {
    handle = await startMcpServer({
        deps: {
            listTools: listMcpTools,
            invoke: (name, args) => invokeAudited(ctx, name, args),
        },
    });
    writeMcpEndpointFile(ctx.getConfigDir(), handle);
}

function stopHost(ctx: ElectronAppContext): void {
    removeMcpEndpointFile(ctx.getConfigDir());
    const current = handle;
    handle = undefined;
    void current?.close();
}

export function readMcpState(ctx: ElectronAppContext): McpState {
    return {
        enabled: readMcpSettings(ctx).enabled,
        running: Boolean(handle),
        url: handle?.url,
        toolCount: listMcpTools().length,
        audit: auditLog(ctx).list(),
    };
}

/** 让服务器状态与设置一致；返回最新状态供界面直接使用。 */
export async function applyMcpSettings(ctx: ElectronAppContext): Promise<McpState> {
    const { enabled } = readMcpSettings(ctx);
    if (enabled && !handle) {
        await startHost(ctx);
    } else if (!enabled && handle) {
        stopHost(ctx);
    }
    return readMcpState(ctx);
}

export async function saveMcpSettings(ctx: ElectronAppContext, input: unknown): Promise<McpState> {
    writeMcpSettings(ctx, input);
    return applyMcpSettings(ctx);
}

/**
 * 注册启动与清理。
 *
 * 启动失败（如端口被占用）不该拖垮应用本身：记录后继续。
 * 清理挂在 `before-quit`——本应用最终调用 `app.exit(0)`，它**不会**触发 `will-quit`。
 */
export function registerMcpHost(ctx: ElectronAppContext): void {
    void applyMcpSettings(ctx).catch((error: unknown) => {
        console.error('[mcp] 初始化失败', error);
    });

    app.on('before-quit', () => {
        removeMcpEndpointFile(ctx.getConfigDir());
        const current = handle;
        handle = undefined;
        void current?.close();
    });
}
