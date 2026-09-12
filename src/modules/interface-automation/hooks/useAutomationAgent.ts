import { useAgentEnvironments } from './useAgentEnvironments';
import { useAgentToolDispatch } from './useAgentToolDispatch';
import { useAgentRunControl } from './useAgentRunControl';

/**
 * 接口自动化 Agent 的组合入口。
 *
 * 拆成三个聚焦 hook：
 * - useAgentEnvironments：环境加载与选择；
 * - useAgentToolDispatch：应用开放给 Agent 的宿主接口实现；
 * - useAgentRunControl：事件订阅、对话状态与草稿操作。
 */
export function useAutomationAgent() {
    const { environmentsRef, environmentId, setEnvironmentId } = useAgentEnvironments();
    const { runScenario, dispatchTool } = useAgentToolDispatch(environmentId, environmentsRef);
    const { send, cancel, applyDraft, rollbackDraft, saveGateway } =
        useAgentRunControl(dispatchTool);

    return {
        environments: environmentsRef.current,
        environmentId,
        setEnvironmentId,
        runScenario,
        send,
        cancel,
        applyDraft,
        rollbackDraft,
        saveGateway,
    };
}
