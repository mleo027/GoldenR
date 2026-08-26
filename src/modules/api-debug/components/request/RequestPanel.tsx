import { useCallback, useEffect, useRef, useState } from 'react';
import {
    SendOutlined,
    CaretDownOutlined,
    CaretRightOutlined,
    FormOutlined,
} from '@ant-design/icons';
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
import { resolveMsgtypeFromParams } from '../../utils/workspace/caseLabel';
import type { QuickFillPayload } from '../../utils/workspace/paramText';

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
}: {
    collapsed: boolean;
    count: number;
    onToggle?: () => void;
    params: ParamItem[];
    onChange: (params: ParamItem[]) => void;
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
                    <span>请求参数</span>
                    <span className="param-section-toggle-count">{count}</span>
                </button>
            </div>
            <div
                className={`param-section-body${collapsed ? ' param-section-body-collapsed' : ''}`}
            >
                <div className="param-section-scroll ui-scroll flex flex-col h-full min-h-0 overflow-y-auto overflow-x-hidden">
                    <ParamEdit params={params} onChange={onChange} />
                </div>
            </div>
        </>
    );
}

export default function RequestPanel({
    paramsCollapsed = false,
    onToggleParamsCollapse,
}: RequestPanelProps) {
    const { activeTab } = useActiveTab();
    const { updateTab, updateTabUndoable } = useTabsActions();
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

    useEffect(() => {
        const parts = parseKcbpAddress(activeTab.address);
        const msgtype = parts.msgtype.trim() || resolveMsgtypeFromParams(activeTab.params);
        if (parts.msgtype.trim() || !msgtype) return;
        updateTab({ address: serializeKcbpAddress({ ...parts, msgtype }) });
    }, [activeTab.address, activeTab.id, activeTab.params, updateTab]);
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
    const compact = layout !== 'full';
    return (
        <div className="flex flex-col h-full min-h-0">
            <SectionHeader
                ref={headerRef}
                icon={<SendOutlined className="text-[var(--color-text-secondary)] text-sm" />}
                title=""
                layout={layout}
                endActions={<PathRunButton compact={compact} />}
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
            />
        </div>
    );
}
