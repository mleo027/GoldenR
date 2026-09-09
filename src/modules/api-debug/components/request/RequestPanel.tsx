import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    SendOutlined,
    CaretDownOutlined,
    CaretRightOutlined,
    FormOutlined,
    CodeOutlined,
} from '@ant-design/icons';
import { Tooltip } from 'antd';
import Path, { PathRunButton } from '../editor/Path';
import ParamEdit from '../editor/ParamEdit';
import ParamQuickFillModal from './ParamQuickFillModal';
import SectionHeader from '@/components/layout/SectionHeader';
import { useRequestHeaderLayout } from '../../hooks/useRequestHeaderLayout';
import { useTabsActions, useActiveTab } from '../../store/useTabs';
import { useDebouncedCommit } from '@/hooks/useDebouncedCommit';
import {
    registerTabDraftFlusher,
    registerTabDraftReader,
} from '../../utils/workspace/tabDraftRegistry';
import { paramsEqual } from '@/hooks/useStableHandlerMap';
import { UI_DEBOUNCE_MS } from '@/constants/ui';
import type { ParamItem } from '../../types/workspace';
import { parseKcbpAddress, serializeKcbpAddress } from '../../utils/kcbp/kcbpAddress';
import type { QuickFillPayload } from '../../utils/workspace/paramText';
import { useCommonParamsState } from '../../store/useCommonParams';
import { useApiDebugEnv } from '../../store/useApiDebugEnv';
import { resolveCommonParamsById } from '../../utils/workspace/commonParams';
import { buildParamsRawText } from '../../utils/workspace/rawText';

interface RequestPanelProps {
    paramsCollapsed?: boolean;
    onToggleParamsCollapse?: () => void;
}

function ParamsSection({
    collapsed,
    count,
    onToggle,
    params,
    onChange,
    commonParams,
    rawMode,
    onToggleRawMode,
    rawText,
}: {
    collapsed: boolean;
    count: number;
    onToggle?: () => void;
    params: ParamItem[];
    onChange: (params: ParamItem[]) => void;
    commonParams: ParamItem[];
    rawMode: boolean;
    onToggleRawMode: () => void;
    rawText: string;
}) {
    return (
        <>
            <div className="param-section-toggle">
                <button
                    type="button"
                    className="param-section-toggle-main"
                    onClick={onToggle}
                    aria-expanded={!collapsed}
                >
                    {collapsed ? <CaretRightOutlined /> : <CaretDownOutlined />}
                    <FormOutlined className="param-section-toggle-icon" />
                    <span className="param-section-toggle-count">{count}</span>
                </button>
                {!collapsed && (
                    <Tooltip title="raw">
                        <button
                            type="button"
                            className={`param-raw-toggle${rawMode ? ' param-raw-toggle-active' : ''}`}
                            onClick={onToggleRawMode}
                            aria-pressed={rawMode}
                        >
                            <CodeOutlined />
                        </button>
                    </Tooltip>
                )}
            </div>
            <div
                className={`param-section-body${collapsed ? ' param-section-body-collapsed' : ''}`}
            >
                {rawMode ? (
                    <textarea
                        readOnly
                        className="param-raw-view ui-scroll"
                        value={rawText}
                        spellCheck={false}
                    />
                ) : (
                    <div className="param-section-scroll ui-scroll flex flex-col h-full min-h-0 overflow-y-auto overflow-x-hidden">
                        <ParamEdit
                            params={params}
                            onChange={onChange}
                            commonParams={commonParams}
                        />
                    </div>
                )}
            </div>
        </>
    );
}

export default function RequestPanel({
    paramsCollapsed = false,
    onToggleParamsCollapse,
}: RequestPanelProps) {
    const { activeTab, activeProject } = useActiveTab();
    const { sets } = useCommonParamsState();
    const commonParams = useMemo(
        () => resolveCommonParamsById(sets, activeProject?.commonParamSetId),
        [activeProject?.commonParamSetId, sets],
    );
    const { updateTabUndoable } = useTabsActions();
    const commitParams = useCallback(
        (params: ParamItem[]) => updateTabUndoable({ params }, '修改请求参数'),
        [updateTabUndoable],
    );
    const {
        draft: paramsDraft,
        setDraftDebounced,
        flushPending,
    } = useDebouncedCommit(activeTab.params, {
        delayMs: UI_DEBOUNCE_MS.edit,
        onCommit: commitParams,
        isEqual: paramsEqual,
    });
    const paramsDraftRef = useRef(paramsDraft);
    paramsDraftRef.current = paramsDraft;

    useEffect(() => registerTabDraftFlusher(flushPending), [flushPending]);
    useEffect(() => registerTabDraftReader(() => ({ params: paramsDraftRef.current })), []);
    useEffect(() => () => flushPending(), [activeTab.id, flushPending]);

    const [quickFillOpen, setQuickFillOpen] = useState(false);
    const handleQuickFillApply = useCallback(
        (result: QuickFillPayload) => {
            flushPending();
            const patch: { params: ParamItem[]; address?: string; name?: string } = {
                params: result.params,
            };
            if (result.msgtype || result.service || result.nodeId) {
                const parts = parseKcbpAddress(activeTab.address);
                patch.address = serializeKcbpAddress({
                    ...parts,
                    ...(result.msgtype ? { msgtype: result.msgtype } : {}),
                    ...(result.service ? { service: result.service } : {}),
                    ...(result.nodeId ? { nodeId: result.nodeId } : {}),
                });
            }
            if (result.title) {
                patch.name = result.title;
            }
            updateTabUndoable(patch, '快速填充参数');
        },
        [activeTab.address, flushPending, updateTabUndoable],
    );

    const { ref: headerRef, layout } = useRequestHeaderLayout<HTMLDivElement>();

    const { env, updateEnv } = useApiDebugEnv();
    const rawMode = env.paramsRawMode;
    const toggleRawMode = useCallback(
        () => updateEnv('paramsRawMode', !rawMode),
        [rawMode, updateEnv],
    );
    const rawText = useMemo(
        () =>
            buildParamsRawText({
                protocol: activeTab.protocol,
                address: activeTab.address,
                tabName: activeTab.name,
                params: paramsDraft,
                commonParams,
            }),
        [activeTab.address, activeTab.name, activeTab.protocol, paramsDraft, commonParams],
    );

    return (
        <div className="flex flex-col h-full min-h-0">
            <SectionHeader
                ref={headerRef}
                icon={<SendOutlined className="text-[var(--color-text-secondary)] text-sm" />}
                title=""
                layout={layout}
                endActions={<PathRunButton />}
            >
                <Path hideRunButton layout={layout} onQuickFill={() => setQuickFillOpen(true)} />
            </SectionHeader>
            <ParamQuickFillModal
                open={quickFillOpen}
                onClose={() => setQuickFillOpen(false)}
                onApply={handleQuickFillApply}
            />
            <ParamsSection
                collapsed={paramsCollapsed}
                count={paramsDraft.length}
                onToggle={onToggleParamsCollapse}
                params={paramsDraft}
                onChange={setDraftDebounced}
                commonParams={commonParams}
                rawMode={rawMode}
                onToggleRawMode={toggleRawMode}
                rawText={rawText}
            />
        </div>
    );
}
