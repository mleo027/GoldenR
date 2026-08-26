import { useEffect, useState } from 'react';
import { Button, Dropdown, Input, Menu, Select, Tooltip } from 'antd';
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

function PathAddressFields({
    addressParts,
    handleAddressPartChange,
    run,
    flushPending,
    defaultTimeout,
    isKGBP,
}: {
    addressParts: ReturnType<typeof usePathBarController>['addressParts'];
    handleAddressPartChange: (field: 'queue' | 'timeout' | 'msgtype' | 'service' | 'nodeId' | 'clientSessionId', value: string) => void;
    run: () => void;
    flushPending: () => void;
    defaultTimeout: string;
    isKGBP: boolean;
}) {
    if (isKGBP) {
        return (
            <>
                <Tooltip title="Msgtype">
                    <span className="path-field-tooltip-wrap">
                        <Input
                            value={addressParts.msgtype}
                            onChange={(e) => handleAddressPartChange('msgtype', e.target.value)}
                            onPressEnter={run}
                            onBlur={flushPending}
                            placeholder="Msgtype"
                            size="small"
                            className="path-field-input path-field-msgtype"
                            variant="borderless"
                            prefix={<TagOutlined className="path-field-icon" />}
                        />
                    </span>
                </Tooltip>
                <Tooltip title="ServiceName">
                    <span className="path-field-tooltip-wrap">
                        <Input
                            value={addressParts.service ?? ''}
                            onChange={(e) => handleAddressPartChange('service', e.target.value)}
                            onPressEnter={run}
                            onBlur={flushPending}
                            placeholder="ServiceName"
                            size="small"
                            className="path-field-input path-field-service"
                            variant="borderless"
                        />
                    </span>
                </Tooltip>
                <Tooltip title="NodeId">
                    <span className="path-field-tooltip-wrap">
                        <Input
                            value={addressParts.nodeId ?? ''}
                            onChange={(e) => handleAddressPartChange('nodeId', e.target.value)}
                            onPressEnter={run}
                            onBlur={flushPending}
                            placeholder="NodeId"
                            size="small"
                            className="path-field-input path-field-node-id"
                            variant="borderless"
                        />
                    </span>
                </Tooltip>
                <Tooltip title="ClientSessionId，可引用入参，例如 @custid">
                    <span className="path-field-tooltip-wrap">
                        <Input
                            value={addressParts.clientSessionId ?? ''}
                            onChange={(e) => handleAddressPartChange('clientSessionId', e.target.value)}
                            onPressEnter={run}
                            onBlur={flushPending}
                            placeholder="@custid"
                            size="small"
                            className="path-field-input path-field-client-session-id"
                            variant="borderless"
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
                            placeholder={defaultTimeout}
                            size="small"
                            className="path-field-input path-field-timeout"
                            variant="borderless"
                            prefix={<ClockCircleOutlined className="path-field-icon" />}
                        />
                    </span>
                </Tooltip>
            </>
        );
    }

    return (
        <>
            <Tooltip title="Queue">
                <span className="path-field-tooltip-wrap path-field-queue-wrap">
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
                        placeholder={defaultTimeout}
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
    layout = 'full',
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
        envVariant,
        showInlineActions,
        showOverflowMenu,
        overflowMenuItems,
        DEFAULT_KCBP_TIMEOUT,
        activeEnvironment,
    } = usePathBarController({ layout, onQuickFill });

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

                <PathAddressFields
                    addressParts={addressParts}
                    handleAddressPartChange={handleAddressPartChange}
                    run={run}
                    flushPending={flushPending}
                    defaultTimeout={DEFAULT_KCBP_TIMEOUT}
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
