import { useCallback, useEffect, useRef } from 'react';
import { App, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import Path, { PathRunButton } from './Path';
import ScriptEditor from './ScriptEditor';
import EditorModeToggle from './EditorModeToggle';
import ResponseMeta from '../response/ResponseMeta';
import { useTabsActions, useActiveTab } from '../../store/useTabs';
import { useDebouncedCommit } from '../../../../hooks/useDebouncedCommit';
import {
    registerTabDraftFlusher,
    registerTabDraftReader,
} from '../../utils/workspace/tabDraftRegistry';
import { registerScriptFormatHandler } from '../../utils/script/scriptFormatRegistry';
import { CASE_SCRIPT_API_HINT, resolveCaseScript } from '../../utils/script/apiScript';
import { parseKcbpAddress } from '../../utils/kcbp/kcbpAddress';
import ScriptConsolePanel from './ScriptConsolePanel';
import { useResponse } from '../../store/useResponse';
import { useScriptConsole, useScriptConsoleActions } from '../../store/useScriptConsole';
import { UI_DEBOUNCE_MS } from '../../../../constants/ui';
import { useRequestHeaderLayout } from '../../hooks/useRequestHeaderLayout';
import { formatJavaScript } from '../../utils/script/formatJavaScript';

function scriptsEqual(left?: string, right?: string): boolean {
    return (left ?? '').trim() === (right ?? '').trim();
}

function ScriptHeader({
    layout,
    compact,
}: {
    layout: 'full' | 'compact' | 'narrow';
    compact: boolean;
}) {
    return (
        <div
            className={`case-script-header section-header section-header--compact section-header--layout-${layout} flex items-center gap-2 pl-2.5 pr-0 border-b border-[var(--color-border-light)] shrink-0`}
        >
            <div className="section-header-path-wrap ui-scroll flex-1 min-w-0">
                <Path showScriptBadge hideRunButton layout={layout} />
            </div>
            <div className="section-header-trailing shrink-0">
                <EditorModeToggle compact={compact} />
                <PathRunButton />
            </div>
        </div>
    );
}

function ScriptEditorArea({
    value,
    onChange,
    onFormat,
    minHeight,
}: {
    value: string;
    onChange: (value: string) => void;
    onFormat: () => void;
    minHeight: string;
}) {
    return (
        <div className="case-script-editor-area h-full min-h-0">
            <Tooltip title={CASE_SCRIPT_API_HINT} placement="bottomRight">
                <button
                    type="button"
                    className="case-script-api-hint"
                    aria-label={`可用 API：${CASE_SCRIPT_API_HINT}`}
                >
                    <InfoCircleOutlined />
                </button>
            </Tooltip>
            <div className="case-script-editor-wrap h-full min-h-0 ui-scroll">
                <ScriptEditor
                    value={value}
                    onChange={onChange}
                    onFormat={onFormat}
                    minHeight={minHeight}
                    className="case-script-editor"
                />
            </div>
        </div>
    );
}

export default function CaseScriptPanel() {
    const { message } = App.useApp();
    const { activeTab } = useActiveTab();
    const { updateTabUndoable } = useTabsActions();
    const response = useResponse(activeTab.id);
    const scriptConsole = useScriptConsole(activeTab.id);
    const { clearScriptConsole } = useScriptConsoleActions();
    const msgtype =
        parseKcbpAddress(activeTab.address).msgtype.trim() || activeTab.name.trim() || '';
    const resolvedScript = resolveCaseScript(activeTab, msgtype);
    const commitScript = useCallback(
        (script: string) => updateTabUndoable({ script }, '修改脚本'),
        [updateTabUndoable],
    );
    const { draft, setDraftDebounced, commitNow, flushPending } = useDebouncedCommit(
        resolvedScript,
        {
            delayMs: UI_DEBOUNCE_MS.edit,
            onCommit: commitScript,
            isEqual: scriptsEqual,
        },
    );
    const draftRef = useRef(draft);
    draftRef.current = draft;

    const handleFormat = useCallback(async () => {
        if (!draft.trim()) return;
        try {
            const formatted = await formatJavaScript(draft);
            if (formatted === draft) return void message.info('代码已经是格式化状态');
            setDraftDebounced(formatted);
            commitNow(formatted);
            message.success('已格式化');
        } catch (error) {
            message.error(error instanceof Error ? error.message : String(error));
        }
    }, [commitNow, draft, message, setDraftDebounced]);

    useEffect(() => registerTabDraftFlusher(flushPending), [flushPending]);
    useEffect(() => registerTabDraftReader(() => ({ script: draftRef.current })), []);
    useEffect(() => registerScriptFormatHandler(handleFormat), [handleFormat]);
    useEffect(() => () => flushPending(), [activeTab.id, flushPending]);

    const { ref: headerRef, layout } = useRequestHeaderLayout<HTMLDivElement>();
    const compact = layout !== 'full';
    return (
        <div className="case-script-panel flex flex-col h-full min-h-0">
            <div ref={headerRef}>
                <ScriptHeader layout={layout} compact={compact} />
            </div>
            <div className="case-script-body flex flex-col flex-1 min-h-0">
                <PanelGroup
                    direction="vertical"
                    autoSaveId="golden-script-console-layout"
                    className="case-script-split flex-1 min-h-0"
                >
                    <Panel defaultSize={72} minSize={35}>
                        <ScriptEditorArea
                            value={draft}
                            onChange={setDraftDebounced}
                            onFormat={() => void handleFormat()}
                            minHeight="100%"
                        />
                    </Panel>
                    <PanelResizeHandle className="script-console-resize">
                        <div className="script-console-resize-line" />
                    </PanelResizeHandle>
                    <Panel defaultSize={28} minSize={15} maxSize={55}>
                        <ScriptConsolePanel
                            snapshot={scriptConsole}
                            onClear={() => clearScriptConsole(activeTab.id)}
                        />
                    </Panel>
                </PanelGroup>
                {response && (
                    <div className="case-script-footer">
                        <ResponseMeta response={response} variant="footer" />
                    </div>
                )}
            </div>
        </div>
    );
}
