/**
 * 能力宿主通道的主进程 ↔ 渲染层契约。
 *
 * 方向：
 * - `capabilities:invoke`  主进程 → 渲染层（请求执行一次能力调用）
 * - `capabilities:respond` 渲染层 → 主进程（回填结果）
 *
 * 执行位置固定在渲染层：场景运行器与权威状态都在那里，主进程直接读库会与界面分叉。
 * 主进程这一侧只做请求/应答关联与超时，不解释任何业务语义。
 *
 * 通道名（`capabilities:invoke` / `capabilities:respond`）在 preload 与主进程里以
 * 字面量出现——`scripts/verify-ipc-integrity.mjs` 按字面量匹配，这里不导出常量。
 */
import type { CapabilityDescriptor } from './types';

/** 主进程发给渲染层的调用请求。 */
export interface CapabilityInvokeRequest {
    /** 仅用于关联请求与应答，不参与业务。 */
    requestId: string;
    /** 全局能力名，格式 `<命名空间>_<动作>`。 */
    name: string;
    args: Record<string, unknown>;
}

/** 渲染层回给主进程的结果。失败不是异常，而是 `ok: false`。 */
export interface CapabilityInvokeResponse {
    requestId: string;
    ok: boolean;
    result?: unknown;
    error?: string;
}

/**
 * 渲染层启动后推给主进程的能力清单。
 *
 * 主进程不能 import 模块（`electron/**` 只允许依赖 `src/shared`），而 MCP 的
 * `tools/list` 必须在模块从未被打开过时也是完整的，因此清单由渲染层主动推送并缓存。
 */
export interface CapabilityManifestPayload {
    descriptors: CapabilityDescriptor[];
}
