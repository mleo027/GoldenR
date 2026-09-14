import { useCallback } from 'react';
import { Button, Switch, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useAppEnv } from '../../../../store/useAppEnv';
import { useApiDebugEnv } from '../../store/useApiDebugEnv';
import { useTabsActions } from '../../store/useTabs';
import type { KcxpEnvironment } from '../../types/kcxp';
import {
    createKcxpEnvironment,
    removeKcxpEnvironment,
    replaceKcxpEnvironmentAtIndex,
} from '../../utils/workspace/kcxpEnvironment';
import { flushAllTabDrafts } from '../../utils/workspace/tabDraftRegistry';
import EnvironmentRow from './EnvironmentRow';

export default function RequestSettings() {
    const { env, updateEnv: updateAppEnv } = useAppEnv();
    const { env: apiEnv, updateEnv, patchEnv } = useApiDebugEnv();
    const { applyKcxpEnvironment } = useTabsActions();
    const { autoSave } = env;
    const { kcxpEnvironments, activeKcxpEnvironmentId } = apiEnv;

    const handleEnvironmentChange = useCallback(
        (index: number, next: KcxpEnvironment) => {
            const environments = replaceKcxpEnvironmentAtIndex(kcxpEnvironments, index, next);
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
            const removal = removeKcxpEnvironment(kcxpEnvironments, id, activeKcxpEnvironmentId);
            if (!removal.removed) return;
            const { environments } = removal;
            patchEnv({
                kcxpEnvironments: environments,
                activeKcxpEnvironmentId: removal.activeId,
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
                配置连接环境与请求保存行为
            </Typography.Paragraph>

            <div className="settings-panel-group settings-toggle-group">
                <div className="settings-panel-row">
                    <div className="settings-panel-row-copy">
                        <div className="settings-panel-row-label">自动保存</div>
                        <div className="settings-panel-row-hint">
                            修改地址与入参后自动写入 SQLite
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
                环境配置
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
