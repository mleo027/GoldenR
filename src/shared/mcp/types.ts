/**
 * MCP 对外暴露的开关与审计契约。
 *
 * 这些类型同时被主进程、preload 与渲染层使用，放在 shared 避免两边各写一份。
 */

export interface McpSettings {
    /**
     * 是否允许外部调用。**默认关闭**：关闭时 MCP 服务器**完全不启动**——
     * 不是"启动了但拒绝调用"，而是没有任何端口在监听。
     */
    enabled: boolean;
}

export interface McpAuditEntry {
    at: number;
    /** 能力命名空间，由工具名前缀得出（主进程不认识模块）。 */
    namespace: string;
    tool: string;
    /**
     * 参数**名字**摘要，绝不记录取值。
     * `write_scenario` 的参数可能是整段脚本，落明文等于把用户代码写进日志。
     */
    argsSummary: string;
    ok: boolean;
    durationMs: number;
    error?: string;
}

/** 设置面板需要的只读状态。**不含 token**——凭据不出主进程。 */
export interface McpState {
    enabled: boolean;
    running: boolean;
    url?: string;
    toolCount: number;
    audit: McpAuditEntry[];
}
