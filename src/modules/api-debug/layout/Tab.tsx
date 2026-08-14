import { useRef, useState, type RefObject } from 'react';
import {
    PanelGroup,
    Panel,
    PanelResizeHandle,
    type ImperativePanelHandle,
} from 'react-resizable-panels';
import RequestPanel from '../components/request/RequestPanel';
import ResponsePanel from '../components/response/ResponsePanel';
import CaseScriptPanel from '../components/editor/CaseScriptPanel';
import { useApiDebugEnv } from '../store/useApiDebugEnv';

export default function Tab() {
    const { env } = useApiDebugEnv();
    const requestPanelRef = useRef<ImperativePanelHandle>(null);
    const responsePanelRef = useRef<ImperativePanelHandle>(null);
    const [paramsCollapsed, setParamsCollapsed] = useState(false);
    const [responseCollapsed, setResponseCollapsed] = useState(false);

    const isScriptMode = env.editorMode === 'script';

    const handleToggleParamsCollapse = () => {
        const panel = requestPanelRef.current;
        if (!panel) return;

        if (panel.isCollapsed()) {
            panel.expand();
            setParamsCollapsed(false);
        } else {
            panel.collapse();
            setParamsCollapsed(true);
        }
    };

    const handleToggleResponseCollapse = () => {
        const panel = responsePanelRef.current;
        if (!panel) return;

        if (panel.isCollapsed()) {
            panel.expand();
            setResponseCollapsed(false);
        } else {
            panel.collapse();
            setResponseCollapsed(true);
        }
    };

    if (isScriptMode) {
        return (
            <div className="flex flex-col flex-1 h-full w-full overflow-hidden">
                <div className="ui-card ui-card--workspace h-full">
                    <CaseScriptPanel />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col flex-1 h-full w-full overflow-hidden">
            <PanelGroup direction="vertical" className="flex-1 gap-3">
                <Panel
                    ref={requestPanelRef as RefObject<ImperativePanelHandle>}
                    defaultSize={50}
                    minSize={12}
                    collapsible
                    collapsedSize={10}
                    onCollapse={() => setParamsCollapsed(true)}
                    onExpand={() => setParamsCollapsed(false)}
                >
                    <div className="ui-card ui-card--workspace h-full workspace-panel workspace-panel-request">
                        <RequestPanel
                            paramsCollapsed={paramsCollapsed}
                            onToggleParamsCollapse={handleToggleParamsCollapse}
                        />
                    </div>
                </Panel>

                <PanelResizeHandle className="panel-resize-handle panel-resize-handle-vertical">
                    <div className="panel-resize-handle-indicator">
                        <div className="panel-resize-handle-indicator-bar" />
                    </div>
                </PanelResizeHandle>

                <Panel
                    ref={responsePanelRef as RefObject<ImperativePanelHandle>}
                    defaultSize={50}
                    minSize={12}
                    collapsible
                    collapsedSize={10}
                    onCollapse={() => setResponseCollapsed(true)}
                    onExpand={() => setResponseCollapsed(false)}
                >
                    <div className="ui-card ui-card--workspace h-full workspace-panel workspace-panel-response">
                        <ResponsePanel
                            responseCollapsed={responseCollapsed}
                            onToggleResponseCollapse={handleToggleResponseCollapse}
                        />
                    </div>
                </Panel>
            </PanelGroup>
        </div>
    );
}
