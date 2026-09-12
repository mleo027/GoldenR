import { useCallback, useEffect } from 'react';
import { App } from 'antd';
import type { AgentGatewayConfigInput } from '@/shared/agent/gateway';
import type { AgentRunEvent, AgentToolCall } from '@/shared/agent/protocol';
import type { AgentEventPayload } from '@/shared/electron/api';
import { agentRuntime } from '@/runtime/agentFacade';
import { useAutomationStore } from '../store/automationStore';
import { useAgentStore, type AgentScriptDraft } from '../store/agentStore';

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * 对话控制侧：订阅 sidecar 事件、驱动状态机、提供发送/取消与草稿操作。
 * 工具执行本身在 useAgentToolDispatch，这里只负责编排与 UI 状态。
 */
export function useAgentRunControl(
    dispatchTool: (runId: string, call: AgentToolCall) => Promise<void>,
) {
    const { message } = App.useApp();

    useEffect(() => {
        void agentRuntime.status().then((status) => useAgentStore.getState().setStatus(status));
        void agentRuntime
            .readGatewayConfig()
            .then((gateway) => useAgentStore.getState().setGateway(gateway));
    }, []);

    const handleEvent = useCallback(
        (payload: AgentEventPayload) => {
            const store = useAgentStore.getState();
            const event: AgentRunEvent = payload.event;

            if (event.type === 'run.started') {
                store.setRunning(true, payload.runId);
                return;
            }
            if (event.type === 'message.delta') {
                store.appendDelta(event.text);
                return;
            }
            if (event.type === 'tool.call') {
                void dispatchTool(payload.runId, event.call);
                return;
            }
            if (event.type === 'script.proposed') {
                const workspace = useAutomationStore.getState().workspace;
                const previous = workspace.scenarios.find(
                    (item) => item.id === event.scenarioId,
                )?.script;
                store.pushDraft({
                    scenarioId: event.scenarioId,
                    script: event.script,
                    previousScript: previous,
                    summary: event.summary,
                });
                return;
            }
            store.finishAssistantMessage();
            store.setRunning(false);
            if (event.type === 'run.error') store.setError(event.message);
        },
        [dispatchTool],
    );

    useEffect(() => agentRuntime.onEvent(handleEvent), [handleEvent]);

    const send = useCallback(
        async (instruction: string) => {
            const text = instruction.trim();
            if (!text) return;
            const store = useAgentStore.getState();
            store.pushUserMessage(text);
            store.setError(undefined);
            store.setRunning(true);
            try {
                const { runId } = await agentRuntime.send({
                    instruction: text,
                    scenarioId: useAutomationStore.getState().selectedScenarioId,
                });
                useAgentStore.getState().setRunning(true, runId);
            } catch (error) {
                const detail = messageOf(error);
                useAgentStore.getState().setRunning(false);
                useAgentStore.getState().setError(detail);
                void message.error(detail);
            }
        },
        [message],
    );

    const cancel = useCallback(async () => {
        const runId = useAgentStore.getState().runId;
        if (runId) await agentRuntime.cancel(runId).catch(() => undefined);
        useAgentStore.getState().setRunning(false);
        useAgentStore.getState().finishAssistantMessage();
    }, []);

    const applyDraft = useCallback((draft: AgentScriptDraft) => {
        useAutomationStore.getState().updateScenario(draft.scenarioId, { script: draft.script });
    }, []);

    const rollbackDraft = useCallback((draft: AgentScriptDraft) => {
        if (draft.previousScript === undefined) return;
        useAutomationStore.getState().updateScenario(draft.scenarioId, {
            script: draft.previousScript,
        });
    }, []);

    const saveGateway = useCallback(async (input: AgentGatewayConfigInput) => {
        const gateway = await agentRuntime.writeGatewayConfig(input);
        useAgentStore.getState().setGateway(gateway);
        useAgentStore.getState().setStatus(await agentRuntime.status());
        return gateway;
    }, []);

    return { send, cancel, applyDraft, rollbackDraft, saveGateway };
}
