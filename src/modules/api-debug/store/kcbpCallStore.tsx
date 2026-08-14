import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { message } from 'antd';
import { useTabsActions, useActiveTab } from './useTabs';
import { useRunLogActions } from './useRunLog';
import { useApiDebugEnv } from './useApiDebugEnv';
import { getElectronAPI } from '../../../lib/electron';
import {
    getKcbpCallFeedback,
    invokeKcbpCall,
    KCBP_MSGTYPE_REQUIRED_MESSAGE,
} from '../services/kcbpCallService';
import { isKcbpCancelled } from '../utils/kcbp/kcbpCancel';
import { flushAllTabDrafts } from '../utils/workspace/tabDraftRegistry';
import {
    getCaseLabel,
    parseMsgtypeFromAddress,
    resolveMsgtypeFromParams,
} from '../utils/workspace/caseLabel';
import { KcbpCallContext } from './KcbpCallContext';
import { useResponseActions } from './useResponse';
import { useScriptConsoleActions } from './useScriptConsole';

export function KcbpCallProvider({ children }: { children: ReactNode }) {
    const { updateTab } = useTabsActions();
    const { env } = useApiDebugEnv();
    const { activeTab, activeCaseIndex } = useActiveTab();
    const { setResponse } = useResponseActions();
    const { setScriptConsole } = useScriptConsoleActions();
    const { pushLog } = useRunLogActions();
    const [runningCaseId, setRunningCaseId] = useState<string | null>(null);
    const callGenerationRef = useRef(0);
    const runningCaseIdRef = useRef<string | null>(null);
    const activeTabRef = useRef(activeTab);
    const activeCaseIndexRef = useRef(activeCaseIndex);
    const editorModeRef = useRef(env.editorMode);

    activeTabRef.current = activeTab;
    activeCaseIndexRef.current = activeCaseIndex;
    editorModeRef.current = env.editorMode;

    const cancelInFlight = useCallback(() => {
        callGenerationRef.current += 1;
        runningCaseIdRef.current = null;
        setRunningCaseId(null);
        void getElectronAPI()?.cancelKcbp?.();
    }, []);

    const cancel = useCallback(() => {
        cancelInFlight();
    }, [cancelInFlight]);

    const run = useCallback(async () => {
        const caseId = activeTabRef.current.id;

        if (runningCaseIdRef.current === caseId) {
            cancelInFlight();
            return;
        }

        if (!getElectronAPI()?.callKcbp) {
            message.error('当前运行环境不支持 KCBP 调用');
            return;
        }

        if (runningCaseIdRef.current) {
            cancelInFlight();
        }

        const tab = activeTabRef.current;
        const resolvedMsgtype =
            parseMsgtypeFromAddress(tab.address).trim() || resolveMsgtypeFromParams(tab.params);
        if (!resolvedMsgtype) {
            message.warning(KCBP_MSGTYPE_REQUIRED_MESSAGE);
            return;
        }

        flushAllTabDrafts();

        const caseIndex = activeCaseIndexRef.current;
        const callId = ++callGenerationRef.current;
        const caseName = getCaseLabel(tab, caseIndex);
        const msgtype =
            resolvedMsgtype ||
            parseMsgtypeFromAddress(tab.address) ||
            tab.name.trim() ||
            '未知接口';
        const editorMode = editorModeRef.current;

        runningCaseIdRef.current = caseId;
        setRunningCaseId(caseId);

        try {
            const outcome = await invokeKcbpCall(tab, editorMode);
            if (callId !== callGenerationRef.current) return;

            updateTab({
                params: outcome.nextParams,
                ...(outcome.nextScript ? { script: outcome.nextScript } : {}),
            });

            setResponse(tab.id, outcome.response);

            if (editorMode === 'script' && outcome.scriptConsole) {
                setScriptConsole(tab.id, outcome.scriptConsole);
            }

            const feedback = getKcbpCallFeedback(outcome);
            message[feedback.level](feedback.message);

            pushLog({
                caseName,
                msgtype: outcome.msgtype || msgtype,
                success: feedback.level === 'success' || feedback.level === 'info',
                timecost: outcome.response.stats?.timecost,
                rows: outcome.response.stats?.rows,
                message: feedback.message,
                timestamp: Date.now(),
            });
        } catch (error) {
            if (callId !== callGenerationRef.current || isKcbpCancelled(error)) return;

            const errorMessage = error instanceof Error ? error.message : String(error);
            setResponse(tab.id, {
                code: '-1',
                message: errorMessage,
                data: [],
                calledAt: Date.now(),
            });
            if (editorMode === 'script') {
                setScriptConsole(tab.id, {
                    entries: [
                        {
                            level: 'error',
                            message: errorMessage,
                            timestamp: Date.now(),
                        },
                    ],
                    ranAt: Date.now(),
                });
            }
            message.error(errorMessage);

            pushLog({
                caseName,
                msgtype,
                success: false,
                message: errorMessage,
                timestamp: Date.now(),
            });
        } finally {
            if (callId === callGenerationRef.current) {
                runningCaseIdRef.current = null;
                setRunningCaseId(null);
            }
        }
    }, [cancelInFlight, pushLog, setResponse, setScriptConsole, updateTab]);

    const value = useMemo(
        () => ({
            runningCaseId,
            run,
            cancel,
        }),
        [runningCaseId, run, cancel],
    );

    return <KcbpCallContext.Provider value={value}>{children}</KcbpCallContext.Provider>;
}
