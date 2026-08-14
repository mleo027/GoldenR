import { useCallback, useEffect, useMemo, useState } from 'react';
import { App, Input, Button, Tooltip, message, Select, Dropdown, Menu } from 'antd';
import type { MenuProps } from 'antd';
import {
    ClockCircleOutlined,
    CopyOutlined,
    DeleteOutlined,
    DownOutlined,
    FormatPainterOutlined,
    LoadingOutlined,
    MoreOutlined,
    SnippetsOutlined,
    TagOutlined,
    ThunderboltOutlined,
    UnorderedListOutlined,
} from '@ant-design/icons';
import { useTabsActions, useActiveTab } from '../../store/useTabs';
import { useApiDebugEnv } from '../../store/useApiDebugEnv';
import { useResponse } from '../../store/useResponse';
import { useKcbpCall } from '../../hooks/useKcbpCall';
import { useDebouncedCommit } from '../../../../hooks/useDebouncedCommit';
import { getElectronAPI } from '../../../../lib/electron';
import { flushAllTabDrafts, registerTabDraftFlusher } from '../../utils/workspace/tabDraftRegistry';
import { formatActiveScript } from '../../utils/script/scriptFormatRegistry';
import { generateTestScriptFromParams } from '../../utils/script/apiScript';
import { parseKcbpResponseStatus } from '../../utils/kcbp/kcbpResponse';
import { UI_DEBOUNCE_MS } from '../../../../constants/ui';
import {
    DEFAULT_KCBP_TIMEOUT,
    normalizeKcbpAddress,
    parseKcbpAddress,
    serializeKcbpAddress,
    type KcbpAddressParts,
} from '../../utils/kcbp/kcbpAddress';
import { getActiveKcxpEnvironment } from '../../utils/workspace/kcxpEnvironment';
import { getPathEnvVariant, getPathEnvShortLabel } from '../../utils/workspace/pathEnvVariant';
import type { PathBarLayout } from '../../utils/pathBarLayout';

interface PathProps {
    showScriptBadge?: boolean;
    /** 为 true 时不渲染 Run（由 SectionHeader 尾部单独挂载） */
    hideRunButton?: boolean;
    layout?: PathBarLayout;
    /** 在地址栏 action 组中显示快速填充入口 */
    onQuickFill?: () => void;
}

interface PathRunButtonProps {
    /** 隐藏 Ctrl+Enter 快捷键提示 */
    compact?: boolean;
}

export function PathRunButton({ compact = false }: PathRunButtonProps) {
    const { loading, run, cancel } = useKcbpCall();
    const canRun = Boolean(getElectronAPI()?.kcbp.call);
    const [elapsedSec, setElapsedSec] = useState(0);

    useEffect(() => {
        if (!loading) {
            setElapsedSec(0);
            return;
        }
        const startedAt = Date.now();
        setElapsedSec(0);
        const timer = window.setInterval(() => {
            setElapsedSec(Math.floor((Date.now() - startedAt) / 1000));
        }, 1000);
        return () => window.clearInterval(timer);
    }, [loading]);

    const handleClick = () => {
        if (loading) {
            cancel();
            return;
        }
        void run();
    };

    return (
        <Button
            type={loading ? 'default' : 'primary'}
            size="small"
            onClick={handleClick}
            disabled={!loading && !canRun}
            className={`path-run-btn${loading ? ' path-run-btn-cancel' : ''}`}
        >
            {loading ? (
                <span className="path-run-label path-run-label-cancel">
                    <LoadingOutlined spin className="path-run-cancel-spinner" />
                    Cancel{elapsedSec > 0 ? ` · ${elapsedSec}s` : ''}
                </span>
            ) : compact ? (
                <span className="path-run-label">Run</span>
            ) : (
                <span className="path-run-content">
                    <span className="path-run-label">Run</span>
                    <span className="path-run-kbd">Ctrl+Enter</span>
                </span>
            )}
        </Button>
    );
}

export default function Path({
    showScriptBadge = false,
    hideRunButton = false,
    layout = 'full',
    onQuickFill,
}: PathProps) {
    const { modal } = App.useApp();
    const { activeTab } = useActiveTab();
    const { updateTab, updateTabUndoable, applyKcxpEnvironment } = useTabsActions();
    const { env, updateEnv } = useApiDebugEnv();
    const { loading, run } = useKcbpCall();
    const response = useResponse(activeTab.id);

    const commitAddress = useCallback(
        (address: string) => {
            updateTabUndoable({ address }, '修改地址');
        },
        [updateTabUndoable],
    );

    const {
        draft: addressDraft,
        setDraftDebounced,
        flushPending,
    } = useDebouncedCommit(activeTab.address, {
        delayMs: UI_DEBOUNCE_MS.edit,
        onCommit: commitAddress,
    });

    useEffect(() => registerTabDraftFlusher(flushPending), [flushPending]);

    useEffect(
        () => () => {
            flushPending();
        },
        [activeTab.id, flushPending],
    );

    useEffect(() => {
        const normalized = normalizeKcbpAddress(activeTab.address);
        if (normalized !== activeTab.address.trim() && activeTab.address.trim()) {
            updateTab({ address: normalized });
        }
    }, [activeTab.address, activeTab.id, updateTab]);

    const addressParts = useMemo(() => parseKcbpAddress(addressDraft), [addressDraft]);

    const handleAddressPartChange = (field: keyof KcbpAddressParts, value: string) => {
        setDraftDebounced(
            serializeKcbpAddress({
                ...addressParts,
                [field]: value,
            }),
        );
    };

    const handleCopyParams = useCallback(async () => {
        flushPending();
        const payload = {
            address: activeTab.address,
            host: addressParts.host,
            msgtype: addressParts.msgtype,
            queue: addressParts.queue,
            timeout: addressParts.timeout,
            params: activeTab.params,
        };
        const text = JSON.stringify(payload, null, 2);
        try {
            await navigator.clipboard.writeText(text);
            message.success('已复制地址与请求参数');
        } catch {
            message.error('复制失败');
        }
    }, [activeTab.address, activeTab.params, addressParts, flushPending]);

    const hasCopyableContent = addressDraft.trim().length > 0 || activeTab.params.length > 0;
    const isScriptMode = env.editorMode === 'script';
    const isCodeEditorMode = isScriptMode;
    const msgtype = addressParts.msgtype.trim() || activeTab.name.trim();

    const canGenerateTestScript = useMemo(() => {
        if (isScriptMode || loading || !response) {
            return false;
        }
        if (String(response.code) === '-1') {
            return false;
        }
        return parseKcbpResponseStatus(response).kind === 'success';
    }, [isScriptMode, loading, response]);

    const applyGeneratedScript = useCallback(() => {
        const script = generateTestScriptFromParams(activeTab.params, msgtype);
        updateTab({ script });
        updateEnv('editorMode', 'script');
        message.success('已生成测试脚本，已切换到脚本模式');
    }, [activeTab.params, msgtype, updateEnv, updateTab]);

    const handleGenerateTestScript = useCallback(() => {
        flushPending();
        flushAllTabDrafts();

        const script = generateTestScriptFromParams(activeTab.params, msgtype);
        const existing = activeTab.script?.trim() ?? '';

        if (existing && existing !== script.trim()) {
            modal.confirm({
                title: '覆盖现有脚本？',
                content: '当前接口已有脚本内容，生成将覆盖为基于入参的测试模板。',
                centered: true,
                mousePosition: null,
                okText: '覆盖生成',
                cancelText: '取消',
                onOk: applyGeneratedScript,
            });
            return;
        }

        applyGeneratedScript();
    }, [activeTab.params, activeTab.script, applyGeneratedScript, flushPending, modal, msgtype]);

    const handleClearParams = useCallback(() => {
        flushPending();
        updateTab({ params: [] });
        message.success('已清空全部参数');
    }, [flushPending, updateTab]);

    const environmentOptions = useMemo(
        () =>
            env.kcxpEnvironments.map((item) => ({
                value: item.id,
                label: getPathEnvShortLabel(item.name),
            })),
        [env.kcxpEnvironments],
    );

    const handleEnvironmentChange = (environmentId: string) => {
        flushPending();
        const environment = getActiveKcxpEnvironment(env.kcxpEnvironments, environmentId);
        updateEnv('activeKcxpEnvironmentId', environmentId);
        applyKcxpEnvironment(environment, 'active');
    };

    const activeEnvironment = useMemo(
        () => getActiveKcxpEnvironment(env.kcxpEnvironments, env.activeKcxpEnvironmentId),
        [env.activeKcxpEnvironmentId, env.kcxpEnvironments],
    );

    const envVariant = getPathEnvVariant(activeEnvironment.name);

    const showInlineActions = layout === 'full';
    const showOverflowMenu = layout !== 'full';

    const overflowMenuItems = useMemo((): MenuProps['items'] => {
        const items: NonNullable<MenuProps['items']> = [];

        if (onQuickFill) {
            items.push({
                key: 'quick-fill',
                label: '快速填充入参',
                icon: <ThunderboltOutlined />,
                onClick: onQuickFill,
            });
        }

        if (isCodeEditorMode) {
            items.push({
                key: 'format',
                label: '格式化脚本',
                icon: <FormatPainterOutlined />,
                onClick: () => formatActiveScript(),
            });
        } else {
            items.push({
                key: 'generate',
                label: '生成测试脚本',
                icon: <SnippetsOutlined />,
                disabled: !canGenerateTestScript,
                onClick: () => handleGenerateTestScript(),
            });
        }

        items.push(
            { type: 'divider' },
            {
                key: 'copy',
                label: '复制地址与参数',
                icon: <CopyOutlined />,
                disabled: !hasCopyableContent,
                onClick: () => void handleCopyParams(),
            },
            {
                key: 'clear',
                label: '清空全部参数',
                icon: <DeleteOutlined />,
                disabled: activeTab.params.length === 0,
                onClick: () => handleClearParams(),
            },
        );

        return items;
    }, [
        activeTab.params.length,
        canGenerateTestScript,
        handleClearParams,
        handleCopyParams,
        handleGenerateTestScript,
        hasCopyableContent,
        isCodeEditorMode,
        onQuickFill,
    ]);

    return (
        <div className={hideRunButton ? 'path-bar path-bar--command-only' : 'path-bar'}>
            <div className="path-command-bar">
                {showScriptBadge ? (
                    <>
                        <span className="path-mode-chip">脚本</span>
                        <div className="path-command-divider" aria-hidden />
                    </>
                ) : null}
                <div className={`path-env-block path-env-block--${envVariant}`}>
                    <Select
                        value={env.activeKcxpEnvironmentId}
                        options={environmentOptions}
                        onChange={handleEnvironmentChange}
                        size="small"
                        variant="borderless"
                        className="path-env-badge-select"
                        popupMatchSelectWidth={false}
                        optionLabelProp="label"
                        suffixIcon={<DownOutlined className="path-env-select-chevron" />}
                    />
                    <Input
                        value={addressParts.host}
                        onChange={(e) => handleAddressPartChange('host', e.target.value)}
                        onPressEnter={run}
                        onBlur={flushPending}
                        placeholder="127.0.0.1:21000"
                        size="small"
                        variant="borderless"
                        className="path-env-host-input"
                    />
                </div>

                <div className="path-command-divider" aria-hidden />

                <>
                    <Tooltip title="Queue">
                        <span className="path-field-tooltip-wrap">
                            <Input
                                value={addressParts.queue}
                                onChange={(e) => handleAddressPartChange('queue', e.target.value)}
                                onPressEnter={run}
                                onBlur={flushPending}
                                placeholder="req1"
                                size="small"
                                className="path-field-input path-field-queue"
                                variant="borderless"
                                prefix={
                                    <span className="path-field-prefix path-field-prefix--icon-only">
                                        <UnorderedListOutlined className="path-field-icon" />
                                    </span>
                                }
                            />
                        </span>
                    </Tooltip>
                    <Tooltip title="Timeout (s)">
                        <span className="path-field-tooltip-wrap">
                            <Input
                                value={addressParts.timeout}
                                onChange={(e) => handleAddressPartChange('timeout', e.target.value)}
                                onPressEnter={run}
                                onBlur={flushPending}
                                placeholder={DEFAULT_KCBP_TIMEOUT}
                                size="small"
                                className="path-field-input path-field-timeout"
                                variant="borderless"
                                prefix={
                                    <span className="path-field-prefix path-field-prefix--icon-only">
                                        <ClockCircleOutlined className="path-field-icon" />
                                    </span>
                                }
                            />
                        </span>
                    </Tooltip>
                </>

                <Tooltip title="Msgtype">
                    <span className="path-field-tooltip-wrap">
                        <Input
                            value={addressParts.msgtype}
                            onChange={(e) => handleAddressPartChange('msgtype', e.target.value)}
                            onPressEnter={run}
                            onBlur={flushPending}
                            placeholder=""
                            size="small"
                            className="path-field-input path-field-msgtype"
                            variant="borderless"
                            prefix={
                                <span className="path-field-prefix path-field-prefix--icon-only">
                                    <TagOutlined className="path-field-icon" />
                                </span>
                            }
                        />
                    </span>
                </Tooltip>

                {showInlineActions ? (
                    <div className="path-actions shrink-0 flex items-center gap-1">
                        {onQuickFill ? (
                            <Tooltip title="快速填充入参">
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<ThunderboltOutlined />}
                                    className="path-helper-btn"
                                    onClick={onQuickFill}
                                />
                            </Tooltip>
                        ) : null}
                        {isCodeEditorMode ? (
                            <Tooltip title="格式化脚本 (Ctrl+Shift+F)">
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<FormatPainterOutlined />}
                                    className="path-helper-btn"
                                    onClick={formatActiveScript}
                                />
                            </Tooltip>
                        ) : (
                            <Tooltip title="生成测试脚本（需 Run 成功）">
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<SnippetsOutlined />}
                                    className="path-helper-btn"
                                    onClick={handleGenerateTestScript}
                                    disabled={!canGenerateTestScript}
                                />
                            </Tooltip>
                        )}
                        <Tooltip title="复制地址与请求参数">
                            <Button
                                type="text"
                                size="small"
                                icon={<CopyOutlined />}
                                className="path-helper-btn"
                                onClick={() => void handleCopyParams()}
                                disabled={!hasCopyableContent}
                            />
                        </Tooltip>
                        <Tooltip title="清空全部参数">
                            <Button
                                type="text"
                                size="small"
                                icon={<DeleteOutlined />}
                                className="path-helper-btn"
                                onClick={handleClearParams}
                                disabled={activeTab.params.length === 0}
                            />
                        </Tooltip>
                    </div>
                ) : null}

                {showOverflowMenu ? (
                    <div className="path-overflow shrink-0">
                        <Dropdown
                            trigger={['click']}
                            placement="bottomRight"
                            dropdownRender={() => (
                                <div
                                    className="path-overflow-panel"
                                    onClick={(event) => event.stopPropagation()}
                                >
                                    <Menu items={overflowMenuItems} />
                                </div>
                            )}
                        >
                            <Tooltip title="更多操作">
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<MoreOutlined />}
                                    className="path-helper-btn path-overflow-btn"
                                />
                            </Tooltip>
                        </Dropdown>
                    </div>
                ) : null}
            </div>

            {!hideRunButton ? <PathRunButton /> : null}
        </div>
    );
}
