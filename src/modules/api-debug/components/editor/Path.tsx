import { useEffect, useState } from 'react';
import { Button, Dropdown, Menu, Popover, Tooltip, Switch } from 'antd';
import { DownOutlined, EyeOutlined } from '@ant-design/icons';
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
import { useKcbpCall } from '../../hooks/useKcbpCall';
import { usePathBarController } from '../../hooks/usePathBarController';
import { getElectronAPI } from '../../../../lib/electron';
import type { PathBarLayout } from '../../utils/pathBarLayout';
import { formatActiveScript } from '../../utils/script/scriptFormatRegistry';
import { useResponse } from '../../store/useResponse';
import { useActiveTab } from '../../store/useTabs';
import { useRequestHistoryNavigation } from '../../store/useRequestHistoryNavigation';
import { getCaseLabel } from '../../utils/workspace/caseLabel';

interface PathProps {
    showScriptBadge?: boolean;
    /** 为 true 时不渲染 Run（由 SectionHeader 尾部单独挂载） */
    hideRunButton?: boolean;
    layout?: PathBarLayout;
    /** 在地址栏 action 组中显示快速填充入口 */
    onQuickFill?: () => void;
}

export function PathRunButton() {
    const { loading, run, cancel, traceEnabled, setTraceEnabled } = useKcbpCall();
    const { activeTab, activeCaseIndex } = useActiveTab();
    const response = useResponse(activeTab.id);
    const { openTrace } = useRequestHistoryNavigation();
    const canRun = Boolean(getElectronAPI()?.kcbp.call);
    const [elapsedSec, setElapsedSec] = useState(0);

    const hasTraceData = Boolean(response?.trace?.events.length);
    const caseName = getCaseLabel(activeTab, activeCaseIndex);

    const handleViewTrace = () => {
        if (response?.trace) {
            openTrace(response.trace, caseName);
        }
    };

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
            <div className="flex items-center gap-1 text-xs whitespace-nowrap" title="按次启用 SQL Server Extended Events">
                <span>SQL Trace</span>
                <Switch
                    size="small"
                    checked={traceEnabled}
                    onChange={setTraceEnabled}
                    disabled={loading}
                />
            </div>
            {hasTraceData && !loading && (
                <Tooltip title="查看 SQL Trace 详情">
                    <Button
                        type="text"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={handleViewTrace}
                        className="path-trace-btn"
                    >
                        Trace
                    </Button>
                </Tooltip>
            )}
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
                <div className="path-env-selector" title={activeEnvironment.name}>
                    <span
                        className={`path-env-protocol path-env-protocol--${(
                            activeEnvironment.protocol || 'KCBP'
                        ).toLowerCase()}`}
                        aria-label={`${activeEnvironment.protocol || 'KCBP'} 环境`}
                    />
                    <Select
                        value={env.activeKcxpEnvironmentId}
                        options={environmentOptions}
                        onChange={handleEnvironmentChange}
                        size="sm"
                        variant="borderless"
                        className="path-env-select"
                        popupClassName="path-env-dropdown"
                        popupMatchSelectWidth={false}
                        optionLabelProp="label"
                        optionRender={(option) => {
                            const environment = option.data?.environment;
                            const name = option.data?.environmentName || option.label;
                            const protocol = environment?.protocol || 'KCBP';
                            const detailParts = [
                                protocol,
                                environment?.host,
                                `timeout=${environment?.timeout || DEFAULT_KCBP_TIMEOUT}s`,
                            ];
                            if (protocol === 'KGBP') {
                                if (environment?.service)
                                    detailParts.push(`service=${environment.service}`);
                                if (environment?.nodeId)
                                    detailParts.push(`node=${environment.nodeId}`);
                                if (environment?.clientSessionId)
                                    detailParts.push(`session=${environment.clientSessionId}`);
                            } else if (environment?.queue) {
                                detailParts.push(`queue=${environment.queue}`);
                            }
                            const detail = detailParts.filter(Boolean).join(' · ');
                            return (
                                <div className="path-env-option">
                                    <div className="path-env-option-name">{name}</div>
                                    <div className="path-env-option-detail">{detail}</div>
                                </div>
                            );
                        }}
                        suffixIcon={<DownOutlined className="path-env-select-chevron" />}
                    />
                </div>
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
