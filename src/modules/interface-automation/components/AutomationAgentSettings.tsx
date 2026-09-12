import { useEffect, useState } from 'react';
import { Button, Input, Password } from '@/components/ui/primitives';
import type { AgentGatewayConfig, AgentGatewayConfigInput } from '@/shared/agent/gateway';
import { isAgentGatewayReady } from '@/shared/agent/gateway';
import type { AgentStatus } from '@/shared/agent/protocol';

/**
 * 模型网关设置。对应「应用统一配置公司网关」：管理员填一次，
 * 业务人员不需要接触密钥。密钥留空表示保持原值不变。
 */
export default function AutomationAgentSettings({
    gateway,
    status,
    onSave,
}: {
    gateway: AgentGatewayConfig;
    status: AgentStatus;
    onSave: (input: AgentGatewayConfigInput) => Promise<AgentGatewayConfig>;
}) {
    const [baseUrl, setBaseUrl] = useState(gateway.baseUrl);
    const [model, setModel] = useState(gateway.model);
    const [apiKey, setApiKey] = useState('');
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState('');

    useEffect(() => {
        setBaseUrl(gateway.baseUrl);
        setModel(gateway.model);
    }, [gateway.baseUrl, gateway.model]);

    const save = async () => {
        setSaving(true);
        setNotice('');
        try {
            await onSave({ baseUrl, model, apiKey: apiKey || undefined });
            setApiKey('');
            setNotice('已保存');
        } catch (error) {
            setNotice(error instanceof Error ? error.message : String(error));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="automation-agent-settings">
            <label className="automation-agent-field" htmlFor="agent-gateway-url">
                <span>网关地址</span>
                <Input
                    id="agent-gateway-url"
                    size="sm"
                    value={baseUrl}
                    placeholder="https://llm.corp.example/v1"
                    onChange={(event) => setBaseUrl(event.target.value)}
                />
            </label>
            <label className="automation-agent-field" htmlFor="agent-gateway-model">
                <span>模型</span>
                <Input
                    id="agent-gateway-model"
                    size="sm"
                    value={model}
                    placeholder="gpt-4o-mini"
                    onChange={(event) => setModel(event.target.value)}
                />
            </label>
            <label className="automation-agent-field" htmlFor="agent-gateway-key">
                <span>密钥</span>
                <Password
                    id="agent-gateway-key"
                    value={apiKey}
                    placeholder={gateway.hasApiKey ? '已配置，留空保持不变' : '请输入网关密钥'}
                    onChange={(event) => setApiKey(event.target.value)}
                />
            </label>
            <div className="automation-agent-settings-foot">
                <span className="automation-agent-hint">
                    {isAgentGatewayReady({ ...gateway, baseUrl, model })
                        ? '配置就绪'
                        : '填写网关地址、模型与密钥后可用'}
                    {status.state === 'failed' && status.error ? ` · ${status.error}` : ''}
                </span>
                <Button size="sm" variant="primary" disabled={saving} onClick={() => void save()}>
                    保存
                </Button>
            </div>
            {notice ? <div className="automation-agent-hint">{notice}</div> : null}
        </div>
    );
}
