import { useEffect, useState } from 'react';
import { Button, Dropdown, Menu, Popover, Tooltip, Switch } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { Input, Select } from '../../../../components/ui/primitives';
import {
    CopyOutlined,
    DeleteOutlined,
    FormatPainterOutlined,
    LoadingOutlined,
    MoreOutlined,
    PlayCircleOutlined,
    SettingOutlined,
    SnippetsOutlined,
    TagOutlined,
    ThunderboltOutlined,
    UnorderedListOutlined,
} from '@ant-design/icons';
import { useApiCall } from '../../hooks/useApiCall';
import { usePathBarController } from '../../hooks/usePathBarController';
import { apiCallRuntime } from '../../../../runtime/apiCallFacade';
import type { PathBarLayout } from '../../utils/pathBarLayout';
import { formatActiveScript } from '../../utils/script/scriptFormatRegistry';
import type { KcxpEnvironment } from '../../types/kcxp';

interface PathProps {
    showScriptBadge?: boolean;
    /** 为 true 时不渲染 Run（由 SectionHeader 尾部单独挂载） */
    hideRunButton?: boolean;
    layout?: PathBarLayout;
    /** 在地址栏 action 组中显示快速填充入口 */
    onQuickFill?: () => void;
}

export function PathRunButton() {
    const { loading, run, cancel, traceEnabled, setTraceEnabled } = useApiCall();
    const canRun = apiCallRuntime.isAvailable();
    const [elapsedSec, setElapsedSec] = useState(0);
    const [tracePopoverOpen, setTracePopoverOpen] = useState(false);

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
        <div className="flex items-center gap-2">
            <Popover
                trigger={['hover', 'click']}
                placement="bottomRight"
                open={tracePopoverOpen}
                onOpenChange={setTracePopoverOpen}
                overlayClassName="path-trace-popover"
                content={
                    <div className="path-trace-panel">
                        <Button
                            type={loading ? 'default' : 'primary'}
                            size="small"
                            block
                            onClick={() => {
                                handleClick();
                                setTracePopoverOpen(false);
                            }}
                            disabled={!loading && !canRun}
                            className={`path-trace-run-btn${loading ? ' path-run-btn-cancel' : ''}`}
                        >
                            {loading ? (
                                <span className="path-run-label path-run-label-cancel">
                                    <LoadingOutlined spin className="path-run-cancel-spinner" />
                                    Cancel{elapsedSec > 0 ? ` 路 ${elapsedSec}s` : ''}
                                </span>
                            ) : (
                                <span className="path-run-content">
                                    <span className="path-run-label">
                                        <PlayCircleOutlined /> Run
                                    </span>
                                    <span className="path-run-kbd">Ctrl+Enter</span>
                                </span>
                            )}
                        </Button>
                        <div className="path-trace-panel-heading">
                            <span className={`path-trace-dot${traceEnabled ? ' is-active' : ''}`} />
                            <strong>SQL Trace</strong>
                            <span className="path-trace-state">{traceEnabled ? 'ON' : 'OFF'}</span>
                        </div>
                        <p>仅对下一次请求生效，采集 SQL Server Extended Events。</p>
                        <div className="path-trace-panel-action">
                            <span>本次运行采集 SQL</span>
                            <Switch
                                size="small"
                                checked={traceEnabled}
                                onChange={setTraceEnabled}
                                disabled={loading}
                                aria-label="本次运行采集 SQL Trace"
                            />
                        </div>
                    </div>
                }
            >
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
                    ) : (
                        <span className="path-run-content">
                            <span className="path-run-label">
                                <PlayCircleOutlined /> Run
                            </span>
                            <span className="path-run-kbd">Ctrl+Enter</span>
                        </span>
                    )}
                </Button>
            </Popover>
        </div>
    );
}

function PathAddressFields({
    addressParts,
    handleAddressPartChange,
    isKGBP,
}: {
    addressParts: ReturnType<typeof usePathBarController>['addressParts'];
    handleAddressPartChange: (
        field: 'queue' | 'timeout' | 'msgtype' | 'service' | 'nodeId' | 'clientSessionId',
        value: string,
    ) => void;
    isKGBP: boolean;
}) {
    const msgtypeInput = (
        <Input
            aria-label="Msgtype"
            className="path-field-input path-field-msgtype-input"
            value={addressParts.msgtype}
            onChange={(event) => handleAddressPartChange('msgtype', event.target.value)}
            placeholder="Msgtype"
        />
    );

    if (isKGBP) {
        return (
            <div className="path-fields-group path-fields-group--kgbp">
                <Tooltip title={`Service: ${addressParts.service || '未设置'}`}>
                    <span className="path-field-tooltip-wrap path-field-pill--service">
                        <span className="path-field-display path-field-service">
                            <span className="path-field-label">Service</span>
                            <span className="path-field-value" title={addressParts.service}>
                                {addressParts.service || '—'}
                            </span>
                        </span>
                    </span>
                </Tooltip>
                <Tooltip title={`Nodeid: ${addressParts.nodeId || '未设置'}`}>
                    <span className="path-field-tooltip-wrap">
                        <span className="path-field-display path-field-node-id">
                            <span className="path-field-label">Nodeid</span>
                            <span className="path-field-value" title={addressParts.nodeId}>
                                {addressParts.nodeId || '—'}
                            </span>
                        </span>
                    </span>
                </Tooltip>
                <Tooltip
                    title={`Sessionid: ${addressParts.clientSessionId || '@custid'}（可引用入参）`}
                >
                    <span className="path-field-tooltip-wrap">
                        <span className="path-field-display path-field-client-session-id">
                            <span className="path-field-label">Sessionid</span>
                            <span
                                className="path-field-value"
                                title={addressParts.clientSessionId || '@custid'}
                            >
                                {addressParts.clientSessionId || '@custid'}
                            </span>
                        </span>
                    </span>
                </Tooltip>
                <Tooltip title="Msgtype">
                    <span className="path-field-tooltip-wrap path-field-pill--push">
                        <span className="path-field-display path-field-msgtype">
                            <TagOutlined className="path-field-icon" />
                            <span className="path-field-label">Msgtype</span>
                            {msgtypeInput}
                        </span>
                    </span>
                </Tooltip>
            </div>
        );
    }

    return (
        <div className="path-fields-group path-fields-group--kcbp">
            <Tooltip title={`Queue: ${addressParts.queue || 'req1'}`}>
                <span className="path-field-tooltip-wrap">
                    <span className="path-field-display path-field-queue">
                        <UnorderedListOutlined className="path-field-icon" />
                        <span className="path-field-label">Queue</span>
                        <span className="path-field-value">{addressParts.queue || 'req1'}</span>
                    </span>
                </span>
            </Tooltip>
            <Tooltip title="Msgtype">
                <span className="path-field-tooltip-wrap path-field-pill--push">
                    <span className="path-field-display path-field-msgtype">
                        <TagOutlined className="path-field-icon" />
                        <span className="path-field-label">Msgtype</span>
                        {msgtypeInput}
                    </span>
                </span>
            </Tooltip>
        </div>
    );
}

function PathNarrowDetails({
    addressParts,
}: {
    addressParts: ReturnType<typeof usePathBarController>['addressParts'];
}) {
    return (
        <Popover
            placement="bottomRight"
            trigger="click"
            title="连接详情"
            content={
                <dl className="path-details-panel">
                    <div>
                        <dt>Nodeid</dt>
                        <dd>{addressParts.nodeId || '未设置'}</dd>
                    </div>
                    <div>
                        <dt>Sessionid</dt>
                        <dd>{addressParts.clientSessionId || '@custid'}</dd>
                    </div>
                </dl>
            }
        >
            <Button
                type="text"
                size="small"
                icon={<SettingOutlined />}
                className="path-helper-btn path-details-btn"
                aria-label="查看 Nodeid 和 Sessionid"
                title="查看连接详情"
            />
        </Popover>
    );
}

function PathInlineActions({
    onQuickFill,
    isCodeEditorMode,
    canGenerateTestScript,
    handleGenerateTestScript,
    hasCopyableContent,
    handleCopyParams,
    hasParams,
    handleClearParams,
}: {
    onQuickFill?: () => void;
    isCodeEditorMode: boolean;
    canGenerateTestScript: boolean;
    handleGenerateTestScript: () => void;
    hasCopyableContent: boolean;
    handleCopyParams: () => Promise<void>;
    hasParams: boolean;
    handleClearParams: () => void;
}) {
    return (
        <div className="path-actions shrink-0 flex items-center gap-1">
            {onQuickFill ? (
                <Tooltip title="快速填充入参">
                    <Button
                        type="text"
                        size="small"
                        icon={<ThunderboltOutlined />}
                        className="path-helper-btn"
                        onClick={onQuickFill}
                        aria-label="快速填充入参"
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
                        aria-label="格式化脚本"
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
                        aria-label="生成测试脚本"
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
                    aria-label="复制地址与请求参数"
                />
            </Tooltip>
            <Tooltip title="清空全部参数">
                <Button
                    type="text"
                    size="small"
                    icon={<DeleteOutlined />}
                    className="path-helper-btn"
                    onClick={handleClearParams}
                    disabled={!hasParams}
                    aria-label="清空全部参数"
                />
            </Tooltip>
        </div>
    );
}

function PathOverflowMenu({
    items,
}: {
    items?: ReturnType<typeof usePathBarController>['overflowMenuItems'];
}) {
    return (
        <div className="path-overflow shrink-0">
            <Dropdown
                trigger={['click']}
                placement="bottomRight"
                dropdownRender={() => (
                    <div
                        className="path-overflow-panel"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <Menu items={items} />
                    </div>
                )}
            >
                <Tooltip title="更多操作">
                    <Button
                        type="text"
                        size="small"
                        icon={<MoreOutlined />}
                        className="path-helper-btn path-overflow-btn"
                        aria-label="更多操作"
                    />
                </Tooltip>
            </Dropdown>
        </div>
    );
}

function getEnvironmentDetail(environment: KcxpEnvironment | undefined, fallback: string) {
    const protocol = environment?.protocol || 'KCBP';
    const details = [protocol, environment?.host, `timeout=${environment?.timeout || fallback}s`];
    if (protocol === 'KGBP') {
        if (environment?.service) details.push(`service=${environment.service}`);
        if (environment?.nodeId) details.push(`node=${environment.nodeId}`);
        if (environment?.clientSessionId) details.push(`session=${environment.clientSessionId}`);
    } else if (environment?.queue) details.push(`queue=${environment.queue}`);
    return details.filter(Boolean).join(' · ');
}

function PathEnvironmentSelector({
    activeId,
    activeEnvironment,
    options,
    defaultTimeout,
    onChange,
}: {
    activeId: string;
    activeEnvironment: KcxpEnvironment;
    options: ReturnType<typeof usePathBarController>['environmentOptions'];
    defaultTimeout: string;
    onChange(id: string): void;
}) {
    return (
        <div className="path-env-selector" title={activeEnvironment.name}>
            <span
                className={`path-env-protocol path-env-protocol--${(
                    activeEnvironment.protocol || 'KCBP'
                ).toLowerCase()}`}
                aria-label={`${activeEnvironment.protocol || 'KCBP'} 环境`}
            />
            <Select
                value={activeId}
                options={options}
                onChange={onChange}
                size="sm"
                variant="borderless"
                className="path-env-select"
                popupClassName="path-env-dropdown"
                popupMatchSelectWidth={false}
                optionLabelProp="label"
                optionRender={(option) => (
                    <div className="path-env-option">
                        <div className="path-env-option-name">
                            {option.data?.environmentName || option.label}
                        </div>
                        <div className="path-env-option-detail">
                            {getEnvironmentDetail(option.data?.environment, defaultTimeout)}
                        </div>
                    </div>
                )}
                suffixIcon={<DownOutlined className="path-env-select-chevron" />}
            />
        </div>
    );
}

export default function Path({
    showScriptBadge = false,
    hideRunButton = false,
    layout = 'full',
    onQuickFill,
}: PathProps) {
    const {
        activeTab,
        env,
        addressParts,
        handleAddressPartChange,
        handleCopyParams,
        hasCopyableContent,
        isCodeEditorMode,
        canGenerateTestScript,
        handleGenerateTestScript,
        handleClearParams,
        environmentOptions,
        handleEnvironmentChange,
        showInlineActions,
        showOverflowMenu,
        overflowMenuItems,
        DEFAULT_KCBP_TIMEOUT,
        activeEnvironment,
    } = usePathBarController({ onQuickFill });
    return (
        <div
            className={`${hideRunButton ? 'path-bar path-bar--command-only' : 'path-bar'} path-bar--layout-${layout}`}
        >
            <div
                className={`path-command-bar${activeEnvironment.protocol === 'KGBP' ? ' path-command-bar--kgbp path-command-bar--advanced-open' : ''}`}
            >
                {showScriptBadge ? (
                    <>
                        <span className="path-mode-chip">脚本</span>
                        <div className="path-command-divider" aria-hidden />
                    </>
                ) : null}
                <PathEnvironmentSelector
                    activeId={env.activeKcxpEnvironmentId}
                    activeEnvironment={activeEnvironment}
                    options={environmentOptions}
                    defaultTimeout={DEFAULT_KCBP_TIMEOUT}
                    onChange={handleEnvironmentChange}
                />
                <div className="path-command-divider" aria-hidden />
                <PathAddressFields
                    addressParts={addressParts}
                    handleAddressPartChange={handleAddressPartChange}
                    isKGBP={activeEnvironment.protocol === 'KGBP'}
                />

                {layout === 'narrow' && activeEnvironment.protocol === 'KGBP' ? (
                    <PathNarrowDetails addressParts={addressParts} />
                ) : null}

                {showInlineActions ? (
                    <PathInlineActions
                        onQuickFill={onQuickFill}
                        isCodeEditorMode={isCodeEditorMode}
                        canGenerateTestScript={canGenerateTestScript}
                        handleGenerateTestScript={handleGenerateTestScript}
                        hasCopyableContent={hasCopyableContent}
                        handleCopyParams={handleCopyParams}
                        hasParams={activeTab.params.length > 0}
                        handleClearParams={handleClearParams}
                    />
                ) : null}

                {showOverflowMenu ? <PathOverflowMenu items={overflowMenuItems} /> : null}
            </div>

            {!hideRunButton ? <PathRunButton /> : null}
        </div>
    );
}
