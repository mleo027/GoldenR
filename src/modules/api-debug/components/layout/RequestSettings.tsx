import { useCallback, useMemo } from 'react';
import { App, Button, Input, Radio, Space, Switch, Tooltip, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useAppEnv } from '../../../../store/useAppEnv';
import { useApiDebugEnv } from '../../store/useApiDebugEnv';
import { useTabsActions, useActiveTab, useTabsState } from '../../store/useTabs';
import type { KcxpApplyScope, KcxpEnvironment } from '../../types/kcxp';
import { DEFAULT_KCBP_TIMEOUT } from '../../utils/kcbp/kcbpAddress';
import { createKcxpEnvironment } from '../../utils/workspace/kcxpEnvironment';
import { getCaseLabel, getCaseMsgtype } from '../../utils/workspace/caseLabel';

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
    const updateField = (field: keyof KcxpEnvironment, value: string) => {
        onChange({ ...environment, [field]: value });
    };

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
            </div>
        </div>
    );
}

export default function RequestSettings() {
    const { message } = App.useApp();
    const { env, updateEnv: updateAppEnv } = useAppEnv();
    const { env: apiEnv, updateEnv, patchEnv } = useApiDebugEnv();
    const { applyKcxpEnvironment } = useTabsActions();
    const { activeProject, activeTab, activeCaseIndex } = useActiveTab();
    const { state } = useTabsState();
    const { autoSave } = env;
    const { kcxpEnvironments, activeKcxpEnvironmentId } = apiEnv;

    const applyContext = useMemo(() => {
        const caseLabel = getCaseLabel(activeTab, activeCaseIndex);
        const msgtype = getCaseMsgtype(activeTab);
        const projectCaseCount = activeProject.cases.length;
        const totalProjects = state.projects.length;
        const totalCases = state.projects.reduce((sum, project) => sum + project.cases.length, 0);

        return {
            caseLabel,
            msgtype,
            projectName: activeProject.name,
            projectCaseCount,
            totalProjects,
            totalCases,
            caseSummary: msgtype ? `${caseLabel} · ${msgtype}` : caseLabel,
            projectSummary: `${activeProject.name}（${projectCaseCount} 个接口）`,
            allSummary: `${totalProjects} 个项目，${totalCases} 个接口`,
        };
    }, [activeCaseIndex, activeProject, activeTab, state.projects]);

    const handleEnvironmentChange = useCallback(
        (index: number, next: KcxpEnvironment) => {
            const environments = kcxpEnvironments.map((item, itemIndex) =>
                itemIndex === index ? next : item,
            );
            patchEnv({ kcxpEnvironments: environments });
        },
        [kcxpEnvironments, patchEnv],
    );

    const handleAddEnvironment = useCallback(() => {
        const nextIndex = kcxpEnvironments.length + 1;
        const next = createKcxpEnvironment(`环境 ${nextIndex}`);
        patchEnv({
            kcxpEnvironments: [...kcxpEnvironments, next],
            activeKcxpEnvironmentId: next.id,
        });
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
        },
        [activeKcxpEnvironmentId, kcxpEnvironments, patchEnv],
    );

    const handleApply = useCallback(
        (scope: KcxpApplyScope) => {
            const environment = kcxpEnvironments.find(
                (item) => item.id === activeKcxpEnvironmentId,
            );
            if (!environment) {
                message.warning('请先选择 KCXP 环境');
                return;
            }
            applyKcxpEnvironment(environment, scope);
            if (scope === 'active') {
                message.success(
                    `已将「${environment.name}」应用到接口「${applyContext.caseSummary}」`,
                );
                return;
            }
            if (scope === 'project') {
                message.success(
                    `已将「${environment.name}」应用到项目「${applyContext.projectSummary}」`,
                );
                return;
            }
            message.success(`已将「${environment.name}」应用到全部（${applyContext.allSummary}）`);
        },
        [activeKcxpEnvironmentId, applyContext, applyKcxpEnvironment, kcxpEnvironments, message],
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
                每组环境包含 Host、Queue、Timeout；切换或应用时保留各接口的 Msgtype 与入参
            </Typography.Paragraph>

            <div className="kcxp-env-list">
                {kcxpEnvironments.map((environment, index) => (
                    <EnvironmentRow
                        key={environment.id}
                        environment={environment}
                        active={environment.id === activeKcxpEnvironmentId}
                        canDelete={kcxpEnvironments.length > 1}
                        onChange={(next) => handleEnvironmentChange(index, next)}
                        onSelect={() => updateEnv('activeKcxpEnvironmentId', environment.id)}
                        onDelete={() => handleDeleteEnvironment(environment.id)}
                    />
                ))}
            </div>

            <div className="kcxp-apply-context">
                <div className="kcxp-apply-context-title">当前工作区</div>
                <div className="kcxp-apply-context-row">
                    <span className="kcxp-apply-context-label">项目</span>
                    <span className="kcxp-apply-context-value">{applyContext.projectSummary}</span>
                </div>
                <div className="kcxp-apply-context-row">
                    <span className="kcxp-apply-context-label">接口</span>
                    <span className="kcxp-apply-context-value">{applyContext.caseSummary}</span>
                </div>
            </div>

            <Space className="kcxp-env-actions" wrap>
                <Button icon={<PlusOutlined />} onClick={handleAddEnvironment}>
                    添加环境
                </Button>
                <Tooltip title={`应用到接口「${applyContext.caseSummary}」`}>
                    <Button onClick={() => handleApply('active')}>应用到当前接口</Button>
                </Tooltip>
                <Tooltip title={`应用到项目「${applyContext.projectSummary}」`}>
                    <Button onClick={() => handleApply('project')}>应用到当前项目</Button>
                </Tooltip>
                <Tooltip title={`应用到全部（${applyContext.allSummary}）`}>
                    <Button onClick={() => handleApply('all')}>应用到全部项目</Button>
                </Tooltip>
            </Space>
        </div>
    );
}
