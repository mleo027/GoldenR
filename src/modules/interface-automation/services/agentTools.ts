/**
 * 宿主工具名 → 平台能力的适配层。
 *
 * 这是绞杀者迁移的过渡形态：实现已经收归 `capabilities/handlers.ts`，统一经平台
 * 注册表调度（`automation_*`）。内置 Agent 移除后本文件一并删除——届时能力由 MCP
 * 直接调用，不再需要这一层名字映射。
 */
import type { AgentToolName } from '@/shared/agent/protocol';
import { capabilityRegistry } from '@/platform/capabilities/registry';
import { AUTOMATION_CAPABILITY_NAMESPACE, registerAutomationCapabilities } from '../capabilities';
import type { AutomationCapabilityContext } from '../capabilities/handlers';

/** 上下文形状由能力层定义（数据主权在渲染层 store 与运行器）。 */
export type AgentToolContext = AutomationCapabilityContext;

export async function executeAgentTool(
    name: AgentToolName,
    args: Record<string, unknown>,
    ctx: AgentToolContext,
): Promise<unknown> {
    registerAutomationCapabilities();
    return capabilityRegistry.invoke(`${AUTOMATION_CAPABILITY_NAMESPACE}_${name}`, args, ctx);
}
