import { useEffect, useState } from 'react';
import { Button, Dropdown, Menu, Tooltip } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { Input, Select } from '../../../../components/ui/primitives';
import {
    CopyOutlined,
    DeleteOutlined,
    FormatPainterOutlined,
    LoadingOutlined,
    MoreOutlined,
    PlayCircleOutlined,
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

interface PathProps {
    showScriptBadge?: boolean;
    /** 为 true 时不渲染 Run（由 SectionHeader 尾部单独挂载） */
    hideRunButton?: boolean;
    layout?: PathBarLayout;
    /** 在地址栏 action 组中显示快速填充入口 */
    onQuickFill?: () => void;
}

export function PathRunButton() {
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
            ) : (
                <span className="path-run-content">
                    <span className="path-run-label">
                        <PlayCircleOutlined /> Run
                    </span>
                    <span className="path-run-kbd">Ctrl+Enter</span>
                </span>
            )}
        </Button>
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
    run: () => void;
    flushPending: () => void;
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
            <>
                <Tooltip title="ServiceName">
                    <span className="path-field-tooltip-wrap path-field-pill--service">
                        <span className="path-field-display path-field-service">
                            <span className="path-field-label">Service</span>
                            <span className="path-field-value">{addressParts.service || '—'}</span>
                        </span>
                    </span>
                </Tooltip>
                <Tooltip title="NodeId">
                    <span className="path-field-tooltip-wrap">
                        <span className="path-field-display path-field-node-id">
                            <span className="path-field-label">Nodeid</span>
                            <span className="path-field-value">{addressParts.nodeId || '—'}</span>
                        </span>
                    </span>
                </Tooltip>
                <Tooltip title="ClientSessionId，可引用入参，例如 @custid">
                    <span className="path-field-tooltip-wrap">
                        <span className="path-field-display path-field-client-session-id">
                            <span className="path-field-label">Sessionid</span>
                            <span className="path-field-value">
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
            </>
        );
    }

    return (
        <>
            <Tooltip title="Queue">
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
        </>
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
                    disabled={!hasParams}
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
                    />
                </Tooltip>
            </Dropdown>
        </div>
    );
}

export default function Path({
    showScriptBadge = false,
    hideRunButton = false,
    onQuickFill,
}: PathProps) {
    const {
        activeTab,
        env,
        run,
        flushPending,
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
        <div className={hideRunButton ? 'path-bar path-bar--command-only' : 'path-bar'}>
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
                    run={run}
                    flushPending={flushPending}
                    isKGBP={activeEnvironment.protocol === 'KGBP'}
                />

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
