/**
 * 与 `src/shared/agent/protocol.ts` 对应的常量。
 *
 * 跨进程契约**有意**保留少量重复：`agent/` 是独立层，不 import 主仓库源码，
 * 这样替换 `agent/` 目录就能升级，不需要动主仓库的构建产物。
 * 两侧一致性由 `electron/services/agent/agentContract.test.ts` 的契约测试守住。
 */
import { HOST_TOOL_NAMES } from './tools.mjs';

/** 必须与 AGENT_PROTOCOL_VERSION 相等。 */
export const PROTOCOL_VERSION = 1;

/** 必须与 AgentCapability 联合类型一致。 */
export const CAPABILITIES = ['generate-script', 'run-scenario', 'inspect-report'];

/** 必须与 AgentToolName 联合类型一致（宿主工具白名单，不含 sidecar 本地工具）。 */
export const TOOL_NAMES = HOST_TOOL_NAMES;

/** sidecar 版本，由接入方在替换 `agent/` 时自行维护。 */
export const AGENT_VERSION = '0.1.0';
