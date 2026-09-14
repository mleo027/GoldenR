import { requireElectronAPI } from './electron';
import type { McpSettings, McpState } from '@/shared/mcp/types';

/**
 * MCP 开关与状态的渲染层入口。
 *
 * 放在 `platform/bridge` 而不是 `runtime`：平台设置面板属于 `ui` 层，按分层规则只能依赖
 * 平台桥接层（与 `kcbpRuntimeConfigClient` 一致）。**凭据不出主进程**，因此这里没有
 * token，只有开关与只读状态。
 */
export function readMcpState(): Promise<McpState> {
    return requireElectronAPI().mcp.readState();
}

export function saveMcpSettings(settings: McpSettings): Promise<McpState> {
    return requireElectronAPI().mcp.writeSettings(settings);
}
