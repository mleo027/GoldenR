import { useCallback } from 'react';
import type { MutableRefObject } from 'react';
import type { AgentToolCall } from '@/shared/agent/protocol';
import type { KcxpEnvironment } from '@/shared/kcxp/types';
import { agentRuntime } from '@/runtime/agentFacade';
import { createAutomationCapabilityContext } from '../capabilities/context';
import { runScenarioForCapability } from '../services/automationCapabilityRun';
import { executeAgentTool } from '../services/agentTools';
import { useAutomationStore } from '../store/automationStore';
import { useAgentStore } from '../store/agentStore';

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Agent 工具调用的执行侧。
 *
 * 应用真正开放给外部的能力都在 `capabilities/` 里；这里只是"面板这条入口"的接线，
 * 与外部调用（MCP）共用同一套上下文工厂与运行路径，因此安全约束不会分叉。
 */
export function useAgentToolDispatch(
    environmentId: string,
    environmentsRef: MutableRefObject<KcxpEnvironment[]>,
) {
    const dispatchTool = useCallback(
        async (runId: string, call: AgentToolCall) => {
            const store = useAgentStore.getState();
            store.pushTool({
                id: call.toolCallId,
                name: call.name,
                status: 'running',
                at: Date.now(),
            });
            try {
                const context = await createAutomationCapabilityContext({
                    environments: environmentsRef.current,
                    selectedScenarioId: useAutomationStore.getState().selectedScenarioId,
                    selectedEnvironmentId: environmentId || undefined,
                });
                const result = await executeAgentTool(call.name, call.arguments, context);
                store.settleTool(call.toolCallId, 'ok');
                await agentRuntime.submitToolResult(runId, {
                    toolCallId: call.toolCallId,
                    ok: true,
                    result,
                });
            } catch (error) {
                const detail = messageOf(error);
                store.settleTool(call.toolCallId, 'error', detail);
                await agentRuntime.submitToolResult(runId, {
                    toolCallId: call.toolCallId,
                    ok: false,
                    error: detail,
                });
            }
        },
        [environmentId, environmentsRef],
    );

    return { runScenario: runScenarioForCapability, dispatchTool };
}
