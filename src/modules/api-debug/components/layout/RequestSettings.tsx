import { useCallback } from 'react';
import { Button, Input, Radio, Switch, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Select } from '../../../../components/ui/primitives';
import { useAppEnv } from '../../../../store/useAppEnv';
import { useApiDebugEnv } from '../../store/useApiDebugEnv';
import { useTabsActions } from '../../store/useTabs';
import type { KcxpEnvironment, KcxpProtocol } from '../../types/kcxp';
import { DEFAULT_KCBP_TIMEOUT } from '../../utils/kcbp/kcbpAddress';
import { createKcxpEnvironment } from '../../utils/workspace/kcxpEnvironment';
import { flushAllTabDrafts } from '../../utils/workspace/tabDraftRegistry';

const PROTOCOL_SELECT_OPTIONS = [
    { value: 'KCBP', label: 'KCBP' },
    { value: 'KGBP', label: 'KGBP' },
];

function EnvironmentRow({
    environment,
    active,
    canDelete,
    onChange,
    onSelect,
    onDelete,
}: {
    environment: KcxpEnvironment;
    active: boolean;
    canDelete: boolean;
    onChange: (next: KcxpEnvironment) => void;
    onSelect: () => void;
    onDelete: () => void;
}) {
    const updateField = <K extends keyof KcxpEnvironment>(field: K, value: KcxpEnvironment[K]) => {
        onChange({ ...environment, [field]: value });
    };

    const isKGBP = (environment.protocol ?? 'KCBP') === 'KGBP';

    return (
        <div className={`kcxp-env-row${active ? ' kcxp-env-row-active' : ''}`}>
            <div className="kcxp-env-row-header">
                <Radio checked={active} onChange={onSelect}>
                    <Input
                        value={environment.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        placeholder="环境名称"
                        size="small"
                        className="kcxp-env-name-input"
                        onClick={(e) => e.stopPropagation()}
                    />
                </Radio>
                <Select
                    value={environment.protocol ?? 'KCBP'}
                    options={PROTOCOL_SELECT_OPTIONS}
                    onChange={(value) => updateField('protocol', value as KcxpProtocol)}
                    size="sm"
                    variant="borderless"
                />
                <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    disabled={!canDelete}
                    onClick={onDelete}
                />
            </div>
            <div className="kcxp-env-row-fields">
                <div className="kcxp-env-field">
                    <span className="kcxp-env-field-label">Host</span>
                    <Input
                        value={environment.host}
                        onChange={(e) => updateField('host', e.target.value)}
                        placeholder="127.0.0.1:21000"
                        size="small"
                    />
                </div>
                {isKGBP ? (
                    <>
                        <div className="kcxp-env-field">
                            <span className="kcxp-env-field-label">
                                ServiceName<span className="kcxp-env-field-required">*</span>
                            </span>
                            <Input
                                value={environment.service ?? ''}
                                onChange={(e) => updateField('service', e.target.value)}
                                placeholder="网关服务名（必填）"
                                size="small"
                                status={!environment.service?.trim() ? 'error' : undefined}
                            />
                        </div>
                        <div className="kcxp-env-field">
                            <span className="kcxp-env-field-label">
                                NodeId<span className="kcxp-env-field-required">*</span>
                            </span>
                            <Input
                                value={environment.nodeId ?? ''}
                                onChange={(e) => updateField('nodeId', e.target.value)}
                                placeholder="节点 ID（必填）"
                                size="small"
                                status={!environment.nodeId?.trim() ? 'error' : undefined}
                            />
                        </div>
                        <div className="kcxp-env-field">
                            <span className="kcxp-env-field-label">ClientSessionId</span>
                            <Input
                                value={environment.clientSessionId ?? ''}
                                onChange={(e) => updateField('clientSessionId', e.target.value)}
                                placeholder="可选"
                                size="small"
                            />
                        </div>
                        <div className="kcxp-env-field">
                            <span className="kcxp-env-field-label">RequestTimeout</span>
                            <Input
                                value={environment.timeout}
                                onChange={(e) => updateField('timeout', e.target.value)}
                                placeholder={DEFAULT_KCBP_TIMEOUT}
                                size="small"
                            />
                        </div>
                    </>
                ) : (
                    <>
                        <div className="kcxp-env-field">
                            <span className="kcxp-env-field-label">Queue</span>
                            <Input
                                value={environment.queue}
                                onChange={(e) => updateField('queue', e.target.value)}
                                placeholder="req1"
                                size="small"
                            />
                        </div>
                        <div className="kcxp-env-field">
                            <span className="kcxp-env-field-label">Timeout</span>
                            <Input
                                value={environment.timeout}
                                onChange={(e) => updateField('timeout', e.target.value)}
                                placeholder={DEFAULT_KCBP_TIMEOUT}
                                size="small"
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default function RequestSettings() {
    const { env, updateEnv: updateAppEnv } = useAppEnv();
    const { env: apiEnv, updateEnv, patchEnv } = useApiDebugEnv();
    const { applyKcxpEnvironment } = useTabsActions();
    const { autoSave } = env;
    const { kcxpEnvironments, activeKcxpEnvironmentId } = apiEnv;

    const handleEnvironmentChange = useCallback(
        (index: number, next: KcxpEnvironment) => {
            const environments = kcxpEnvironments.map((item, itemIndex) =>
                itemIndex === index ? next : item,
            );
            patchEnv({ kcxpEnvironments: environments });
            // 编辑当前激活环境的字段时同步应用到全部接口，避免单调用使用过期连接参数
            if (next.id === activeKcxpEnvironmentId) {
                flushAllTabDrafts();
                applyKcxpEnvironment(next);
            }
        },
        [activeKcxpEnvironmentId, applyKcxpEnvironment, kcxpEnvironments, patchEnv],
    );

    const handleAddEnvironment = useCallback(() => {
        const next = createKcxpEnvironment(`环境 ${kcxpEnvironments.length + 1}`);
        patchEnv({ kcxpEnvironments: [...kcxpEnvironments, next] });
    }, [kcxpEnvironments, patchEnv]);

    const handleDeleteEnvironment = useCallback(
        (id: string) => {
            if (kcxpEnvironments.length <= 1) return;
            const environments = kcxpEnvironments.filter((item) => item.id !== id);
            patchEnv({
                kcxpEnvironments: environments,
                activeKcxpEnvironmentId:
                    activeKcxpEnvironmentId === id ? environments[0].id : activeKcxpEnvironmentId,
            });
            if (activeKcxpEnvironmentId === id) {
                flushAllTabDrafts();
                applyKcxpEnvironment(environments[0]);
            }
        },
        [activeKcxpEnvironmentId, applyKcxpEnvironment, kcxpEnvironments, patchEnv],
    );

    const handleSelectEnvironment = useCallback(
        (environment: KcxpEnvironment) => {
            flushAllTabDrafts();
            updateEnv('activeKcxpEnvironmentId', environment.id);
            applyKcxpEnvironment(environment);
        },
        [applyKcxpEnvironment, updateEnv],
    );

    return (
        <div className="settings-panel">
            <Typography.Title level={5} className="settings-panel-title">
                请求
            </Typography.Title>
            <Typography.Paragraph className="settings-panel-desc">
                配置 KCXP 连接环境与请求保存行为
            </Typography.Paragraph>

            <div className="settings-panel-group settings-toggle-group">
                <div className="settings-panel-row">
                    <div className="settings-panel-row-copy">
                        <div className="settings-panel-row-label">自动保存</div>
                        <div className="settings-panel-row-hint">
                            修改地址与入参后自动写入 project.json
                        </div>
                    </div>
                    <Switch
                        className="settings-switch"
                        size="small"
                        checked={autoSave}
                        onChange={(checked) => updateAppEnv('autoSave', checked)}
                    />
                </div>
            </div>

            <Typography.Title level={5} className="settings-section-title">
                KCXP 环境
            </Typography.Title>
            <Typography.Paragraph type="secondary" className="settings-section-desc">
                每组环境包含协议及其连接参数；选中后自动应用到全部接口，保留 Msgtype 与入参
            </Typography.Paragraph>

            <div className="kcxp-env-list">
                {kcxpEnvironments.map((environment, index) => (
                    <EnvironmentRow
                        key={environment.id}
                        environment={environment}
                        active={environment.id === activeKcxpEnvironmentId}
                        canDelete={kcxpEnvironments.length > 1}
                        onChange={(next) => handleEnvironmentChange(index, next)}
                        onSelect={() => handleSelectEnvironment(environment)}
                        onDelete={() => handleDeleteEnvironment(environment.id)}
                    />
                ))}
            </div>

            <div className="kcxp-env-actions">
                <Button icon={<PlusOutlined />} onClick={handleAddEnvironment}>
                    添加环境
                </Button>
            </div>
        </div>
    );
}
