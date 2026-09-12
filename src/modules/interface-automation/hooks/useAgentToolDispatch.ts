import { useCallback } from 'react';
import type { MutableRefObject } from 'react';
import { useRef } from 'react';
import type { AgentToolCall } from '@/shared/agent/protocol';
import type { KcxpEnvironment } from '@/shared/kcxp/types';
import { agentRuntime } from '@/runtime/agentFacade';
import { AutomationRunController, inspectAutomationScript } from '../services/automationRunner';
import { saveScenarioReport } from '../services/automationData';
import { executeAgentTool, type AgentToolContext } from '../services/agentTools';
import {
    resolveScenarioInputs,
    sensitiveInputNames,
    validateScenarioInputs,
} from '../utils/scenarioInputs';
import { useAutomationStore } from '../store/automationStore';
import { useAgentStore } from '../store/agentStore';

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** 用当前工作区状态组装工具上下文；数据主权始终在渲染层的 store 与运行器。 */
function buildToolContext(
    environments: KcxpEnvironment[],
    environmentId: string,
    runScenario: AgentToolContext['runScenario'],
): AgentToolContext {
    const state = useAutomationStore.getState();
    return {
        workspace: state.workspace,
        reports: state.scenarioReports,
        environments,
        selectedScenarioId: state.selectedScenarioId,
        selectedEnvironmentId: environmentId || undefined,
        createScenario: (input) => useAutomationStore.getState().createScenario(input),
        updateScenario: (id, patch) => useAutomationStore.getState().updateScenario(id, patch),
        runScenario,
    };
}

/**
 * Agent 工具调用的执行侧：应用真正开放给 Agent 的接口都在这里落地。
 * 运行走模块内既有运行器，因此 SQL 写库策略、生产环境禁令、报告限制继续生效。
 */
export function useAgentToolDispatch(
    environmentId: string,
    environmentsRef: MutableRefObject<KcxpEnvironment[]>,
) {
    const controllerRef = useRef<AutomationRunController>();

    const runScenario = useCallback(
        async (scenarioId: string, targetEnvironmentId?: string) => {
            const state = useAutomationStore.getState();
            const scenario = state.workspace.scenarios.find((item) => item.id === scenarioId);
            if (!scenario) throw new Error(`场景不存在：${scenarioId}`);

            const wanted = targetEnvironmentId || environmentId;
            const environment =
                environmentsRef.current.find((item) => item.id === wanted) ??
                environmentsRef.current[0];
            if (!environment) throw new Error('没有可用的运行环境');

            const metadata = await inspectAutomationScript(scenario.script);
            const inputs = resolveScenarioInputs(scenario.id, metadata);
            const controller = new AutomationRunController();
            controllerRef.current = controller;
            try {
                const report = await controller.run({
                    scenario,
                    environment,
                    inputs: validateScenarioInputs(metadata, inputs),
                    sensitiveInputNames: sensitiveInputNames(metadata),
                });
                useAutomationStore.getState().setScenarioReport(report);
                await saveScenarioReport(report);
                return report;
            } finally {
                controllerRef.current = undefined;
            }
        },
        [environmentId, environmentsRef],
    );

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
                const context = buildToolContext(
                    environmentsRef.current,
                    environmentId,
                    runScenario,
                );
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
        [environmentId, environmentsRef, runScenario],
    );

    return { runScenario, dispatchTool };
}
