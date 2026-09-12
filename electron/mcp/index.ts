import { app } from 'electron';
import { invokeCapabilityInRenderer } from '../services/capabilities/capabilityChannel';
import { removeMcpEndpointFile, writeMcpEndpointFile } from './endpointFile';
import { listMcpTools } from './manifest';
import { startMcpServer, type McpServerHandle } from './server';

/**
 * MCP 服务器的主进程生命周期。
 *
 * 生命周期刻意做得很短：启动、写端点文件、退出时删文件。服务器本身不认识任何业务
 * 语义——`tools/list` 读渲染层推来的清单，`tools/call` 转给渲染层执行。
 */
let handle: McpServerHandle | undefined;

export interface McpHostOptions {
    /** 配置目录：开发时是仓库根，安装版是 userData。 */
    getConfigDir: () => string;
    /** 仅用于测试注入。 */
    startServer?: typeof startMcpServer;
}

export async function startMcpHost(options: McpHostOptions): Promise<McpServerHandle> {
    const start = options.startServer ?? startMcpServer;
    const started = await start({
        deps: {
            listTools: listMcpTools,
            invoke: (name, args) => invokeCapabilityInRenderer(name, args),
        },
    });
    handle = started;
    writeMcpEndpointFile(options.getConfigDir(), started);
    return started;
}

/**
 * 注册启动与清理。
 *
 * 用 `before-quit` 而不是 `will-quit`：本应用的退出流程最终调用 `app.exit(0)`，
 * 而它**不会**触发 `will-quit`——写在后者里的清理根本不会执行。
 */
export function registerMcpHost(options: McpHostOptions): void {
    void startMcpHost(options).catch((error: unknown) => {
        // MCP 起不来不该拖垮应用本身：记录后继续。
        console.error('[mcp] 服务器启动失败', error);
    });

    app.on('before-quit', () => {
        removeMcpEndpointFile(options.getConfigDir());
        const current = handle;
        handle = undefined;
        void current?.close();
    });
}
