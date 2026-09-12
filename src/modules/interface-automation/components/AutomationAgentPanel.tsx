import { useState } from 'react';
import { App } from 'antd';
import { Tooltip } from 'antd';
import {
    ClearOutlined,
    DoubleRightOutlined,
    SendOutlined,
    SettingOutlined,
    StopOutlined,
} from '@ant-design/icons';
import { Button, Select, TextArea } from '@/components/ui/primitives';
import type { AgentStatus } from '@/shared/agent/protocol';
import type { KcxpEnvironment } from '@/shared/kcxp/types';
import {
    useAgentStore,
    type AgentChatMessage,
    type AgentScriptDraft,
    type AgentState,
} from '../store/agentStore';
import { useAutomationAgent } from '../hooks/useAutomationAgent';
import AutomationAgentDraft from './AutomationAgentDraft';
import AutomationAgentSettings from './AutomationAgentSettings';

const STATUS_TEXT: Record<AgentStatus['state'], string> = {
    stopped: '未启动',
    starting: '启动中',
    ready: '就绪',
    failed: '不可用',
};

function AgentStatusPill({ status }: { status: AgentStatus }) {
    return (
        <Tooltip title={status.error ?? status.agentVersion ?? ''}>
            <span className={`automation-agent-status is-${status.state}`}>
                <i />
                {STATUS_TEXT[status.state]}
            </span>
        </Tooltip>
    );
}

function AgentMessage({ message }: { message: AgentChatMessage }) {
    return (
        <div className={`automation-agent-message is-${message.role}`}>
            <div className="automation-agent-bubble">{message.text}</div>
        </div>
    );
}

function AgentHeader({
    agent,
    environments,
    environmentId,
    onEnvironmentChange,
    onToggleSettings,
    onCollapse,
}: {
    agent: AgentState;
    environments: KcxpEnvironment[];
    environmentId: string;
    onEnvironmentChange: (id: string) => void;
    onToggleSettings: () => void;
    onCollapse?: () => void;
}) {
    return (
        <header className="automation-agent-head">
            <AgentStatusPill status={agent.status} />
            <span className="automation-agent-title">Agent</span>
            <span className="automation-agent-head-actions">
                <Select
                    size="sm"
                    className="automation-agent-env"
                    value={environmentId || undefined}
                    placeholder="运行环境"
                    options={environments.map((item) => ({ label: item.name, value: item.id }))}
                    onChange={(value) => onEnvironmentChange(String(value))}
                />
                <Tooltip title="模型网关设置">
                    <Button
                        size="sm"
                        variant="ghost"
                        icon={<SettingOutlined />}
                        onClick={onToggleSettings}
                    />
                </Tooltip>
                <Tooltip title="清空对话">
                    <Button
                        size="sm"
                        variant="ghost"
                        icon={<ClearOutlined />}
                        onClick={() => agent.reset()}
                    />
                </Tooltip>
                <Tooltip title="收起侧边栏">
                    <Button
                        size="sm"
                        variant="ghost"
                        icon={<DoubleRightOutlined />}
                        disabled={!onCollapse}
                        onClick={onCollapse}
                    />
                </Tooltip>
            </span>
        </header>
    );
}

function AgentConversation({
    agent,
    busy,
    onApply,
    onApplyAndRun,
    onRollback,
}: {
    agent: AgentState;
    busy: boolean;
    onApply: (draft: AgentScriptDraft) => void;
    onApplyAndRun: (draft: AgentScriptDraft) => void;
    onRollback: (draft: AgentScriptDraft) => void;
}) {
    return (
        <div className="automation-agent-body">
            {agent.messages.length === 0 ? (
                <div className="automation-agent-empty">
                    描述你的意图，Agent 会读取现有场景、生成脚本并运行验证。
                </div>
            ) : (
                agent.messages.map((item) => <AgentMessage key={item.id} message={item} />)
            )}

            {agent.tools.length ? (
                <div className="automation-agent-tools">
                    {agent.tools.map((tool) => (
                        <div key={tool.id} className={`automation-agent-tool is-${tool.status}`}>
                            <b>{tool.name}</b>
                            <span>{tool.status === 'running' ? '执行中…' : tool.status}</span>
                        </div>
                    ))}
                </div>
            ) : null}

            {agent.drafts.map((draft) => (
                <AutomationAgentDraft
                    key={draft.id}
                    draft={draft}
                    busy={busy}
                    onApply={onApply}
                    onApplyAndRun={onApplyAndRun}
                    onRollback={onRollback}
                />
            ))}

            {agent.error ? <div className="automation-agent-error">{agent.error}</div> : null}
        </div>
    );
}

function AgentComposer({
    running,
    onSend,
    onStop,
}: {
    running: boolean;
    onSend: (text: string) => void;
    onStop: () => void;
}) {
    const [value, setValue] = useState('');
    const submit = () => {
        const text = value.trim();
        if (!text || running) return;
        setValue('');
        onSend(text);
    };
    return (
        <div className="automation-agent-composer">
            <TextArea
                value={value}
                autoSize={{ minRows: 2, maxRows: 5 }}
                placeholder="用自然语言描述你要做什么，例如「给场景加一个查询余额的断言」"
                onChange={(event) => setValue(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                        event.preventDefault();
                        submit();
                    }
                }}
            />
            <div className="automation-agent-composer-actions">
                {running ? (
                    <Button size="sm" variant="danger" icon={<StopOutlined />} onClick={onStop}>
                        停止
                    </Button>
                ) : (
                    <Button size="sm" variant="primary" icon={<SendOutlined />} onClick={submit}>
                        发送
                    </Button>
                )}
            </div>
        </div>
    );
}

export default function AutomationAgentPanel({ onCollapse }: { onCollapse?: () => void }) {
    const { message: toast } = App.useApp();
    const agent = useAgentStore();
    const {
        environmentId,
        setEnvironmentId,
        environments,
        send,
        cancel,
        runScenario,
        applyDraft,
        rollbackDraft,
        saveGateway,
    } = useAutomationAgent();
    const [showSettings, setShowSettings] = useState(false);

    const applyAndRun = async (draft: AgentScriptDraft) => {
        applyDraft(draft);
        try {
            const report = await runScenario(draft.scenarioId, environmentId);
            if (report.status === 'passed') void toast.success('运行通过');
            else void toast.error(report.error ?? `运行${report.status}`);
        } catch (error) {
            void toast.error(error instanceof Error ? error.message : String(error));
        }
    };

    return (
        <div className="automation-agent">
            <AgentHeader
                agent={agent}
                environments={environments}
                environmentId={environmentId}
                onEnvironmentChange={setEnvironmentId}
                onToggleSettings={() => setShowSettings((value) => !value)}
                onCollapse={onCollapse}
            />
            {showSettings ? (
                <AutomationAgentSettings
                    gateway={agent.gateway}
                    status={agent.status}
                    onSave={saveGateway}
                />
            ) : null}
            <AgentConversation
                agent={agent}
                busy={agent.running}
                onApply={applyDraft}
                onApplyAndRun={(draft) => void applyAndRun(draft)}
                onRollback={rollbackDraft}
            />
            <AgentComposer
                running={agent.running}
                onSend={(text) => void send(text)}
                onStop={() => void cancel()}
            />
        </div>
    );
}
