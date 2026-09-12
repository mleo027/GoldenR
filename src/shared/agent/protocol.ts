/**
 * 主进程 ↔ Agent sidecar 的冻结契约（v1）。
 *
 * 这是两侧**唯一**的耦合面：GoldenR 主进程与 `agent/` 目录各自独立演进，
 * 只通过本文件的类型与常量交互。任何不兼容改动都必须递增
 * `AGENT_PROTOCOL_VERSION`；主进程在握手阶段会拒绝版本不匹配的 sidecar，
 * 而不是静默降级，避免"升级了 agent 目录但主进程还是旧契约"这种最难查的问题。
 *
 * 传输约定：
 * - sidecar 监听 `127.0.0.1:<随机端口>`，端口通过 stdout 的 ready 行上报；
 * - 所有请求携带 `Authorization: Bearer <token>`，token 由主进程生成并注入环境变量；
 * - 主进程 → sidecar 用 HTTP，运行事件用 SSE（`GET /runs/:runId/events`）；
 * - sidecar → 主进程的能力请求（`tool.call`）由主进程执行后，经
 *   `POST /runs/:runId/tool-results` 回填结果。
 *
 * 因此场景数据主权、SQL 写库策略与生产环境禁令仍然留在主进程，
 * Agent 只持有"可申请的能力白名单"。
 */

/** 契约版本。不兼容改动必须递增，并同步更新 `agent/protocol.mjs`。 */
export const AGENT_PROTOCOL_VERSION = 1;

/** sidecar 启动后写入 stdout 的单行 JSON 声明。 */
export interface AgentReadyLine {
    type: 'ready';
    protocolVersion: number;
    agentVersion: string;
    port: number;
}

export interface AgentStartupErrorLine {
    type: 'error';
    message: string;
}

export type AgentStartupLine = AgentReadyLine | AgentStartupErrorLine;

/**
 * Agent 自报的能力，主进程据此决定是否放行对应操作。
 * 与 `agent/protocol.mjs` 的 CAPABILITIES 保持一致，由契约测试守卫。
 */
export const AGENT_CAPABILITIES = ['generate-script', 'run-scenario', 'inspect-report'] as const;

export type AgentCapability = (typeof AGENT_CAPABILITIES)[number];

export interface AgentHelloResult {
    protocolVersion: number;
    agentVersion: string;
    capabilities: AgentCapability[];
}

/**
 * 主进程提供给 Agent 的工具白名单。
 *
 * Agent 没有文件系统、网络或数据库工具，只能请求这些由主进程执行的能力。
 * 新增工具时必须同时更新 `agent/protocol.mjs`、`agent/README.md` 与宿主实现，
 * 并递增契约版本。与 sidecar 的一致性由契约测试守卫。
 */
export const AGENT_TOOL_NAMES = [
    'list_scenarios',
    'read_scenario',
    'write_scenario',
    'list_environments',
    'run_scenario',
    'read_report',
] as const;

export type AgentToolName = (typeof AGENT_TOOL_NAMES)[number];

export interface AgentToolCall {
    toolCallId: string;
    name: AgentToolName;
    arguments: Record<string, unknown>;
}

export interface AgentToolResultRequest {
    toolCallId: string;
    ok: boolean;
    result?: unknown;
    error?: string;
}

export interface AgentCreateRunRequest {
    /** 业务人员的自然语言描述。 */
    instruction: string;
    /** 需要改写的既有场景；缺省表示新建。 */
    scenarioId?: string;
    projectId?: string;
    folderId?: string;
}

export interface AgentCreateRunResult {
    runId: string;
}

export type AgentRunStatus = 'succeeded' | 'failed' | 'cancelled';

/** 运行期间经 SSE 推送的事件。 */
export type AgentRunEvent =
    | { type: 'run.started'; runId: string }
    | { type: 'message.delta'; text: string }
    | { type: 'tool.call'; call: AgentToolCall }
    | { type: 'script.proposed'; scenarioId: string; script: string; summary?: string }
    | { type: 'run.finished'; status: AgentRunStatus; summary?: string }
    | { type: 'run.error'; message: string };

export type AgentProcessState = 'stopped' | 'starting' | 'ready' | 'failed';

/** 主进程对外暴露的 sidecar 状态。 */
export interface AgentStatus {
    state: AgentProcessState;
    protocolVersion?: number;
    agentVersion?: string;
    capabilities?: AgentCapability[];
    error?: string;
}
