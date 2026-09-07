import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTabsActions, useActiveTab } from './useTabs';
import { useRunLogActions } from './useRunLog';
import { useApiDebugEnv } from './useApiDebugEnv';
import { useRequestHistoryActions } from './useRequestHistory';
import {
    canInvokeKcbp,
    cancelKcbpCall,
    getKcbpCallFeedback,
    invokeKcbpCall,
    KCBP_MSGTYPE_REQUIRED_MESSAGE,
} from '../services/kcbpCallService';
import { isKcbpCancelled } from '../utils/kcbp/kcbpCancel';
import { createRequestHistoryId } from './requestHistoryData';
import { getActiveKcxpEnvironment } from '../utils/workspace/kcxpEnvironment';
import { parseKcbpAddress } from '../utils/kcbp/kcbpAddress';
import { parseKcbpResponseStatus } from '../utils/kcbp/kcbpResponse';
import { flushAllTabDrafts } from '../utils/workspace/tabDraftRegistry';
import {
    getCaseLabel,
    parseMsgtypeFromAddress,
    resolveMsgtypeFromParams,
} from '../utils/workspace/caseLabel';
import { KcbpCallContext } from './KcbpCallContext';
import {
    KcbpFeedbackBridgeContext,
    type KcbpFeedbackHandler,
    type KcbpFeedbackLevel,
} from './kcbpFeedbackContext';
import { useResponseActions } from './useResponse';
import { useScriptConsoleActions } from './useScriptConsole';
import { useCommonParamsState } from './useCommonParams';
import { resolveCommonParamsById } from '../utils/workspace/commonParams';

export function KcbpCallProvider({ children }: { children: ReactNode }) {
    const { updateTab } = useTabsActions();
    const { env } = useApiDebugEnv();
    const { activeProject, activeTab, activeCaseIndex } = useActiveTab();
    const { sets: commonSets } = useCommonParamsState();
    const { setResponse } = useResponseActions();
    const { setScriptConsole } = useScriptConsoleActions();
    const { pushLog } = useRunLogActions();
    const { addEntry } = useRequestHistoryActions();
    const [runningCaseId, setRunningCaseId] = useState<string | null>(null);
    const callGenerationRef = useRef(0);
    const runningCaseIdRef = useRef<string | null>(null);
    const activeTabRef = useRef(activeTab);
    const activeProjectRef = useRef(activeProject);
    const activeCaseIndexRef = useRef(activeCaseIndex);
    const commonSetsRef = useRef(commonSets);
    const envRef = useRef(env);
    const editorModeRef = useRef(env.editorMode);
    const feedbackRef = useRef<KcbpFeedbackHandler | null>(null);

    activeTabRef.current = activeTab;
    activeProjectRef.current = activeProject;
    activeCaseIndexRef.current = activeCaseIndex;
    commonSetsRef.current = commonSets;
    envRef.current = env;
    editorModeRef.current = env.editorMode;

    const registerFeedback = useCallback((handler: KcbpFeedbackHandler | null) => {
        feedbackRef.current = handler;
    }, []);

    const notify = useCallback((level: KcbpFeedbackLevel, content: string) => {
        feedbackRef.current?.({ level, content });
    }, []);

    const cancelInFlight = useCallback(() => {
        callGenerationRef.current += 1;
        runningCaseIdRef.current = null;
        setRunningCaseId(null);
        cancelKcbpCall();
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

        if (!canInvokeKcbp()) {
            notify('error', '当前运行环境不支持 KCBP 调用');
            return;
        }

        if (runningCaseIdRef.current) {
            cancelInFlight();
        }

        const drafts = flushAllTabDrafts();
        const tab = {
            ...activeTabRef.current,
            ...(drafts.params ? { params: drafts.params } : {}),
            ...(typeof drafts.address === 'string' ? { address: drafts.address } : {}),
            ...(typeof drafts.script === 'string' ? { script: drafts.script } : {}),
        };
        const project = activeProjectRef.current;
        const commonParams = resolveCommonParamsById(
            commonSetsRef.current,
            project?.commonParamSetId,
        );
        const resolvedMsgtype =
            parseMsgtypeFromAddress(tab.address).trim() || resolveMsgtypeFromParams(tab.params);
        if (!resolvedMsgtype) {
            notify('warning', KCBP_MSGTYPE_REQUIRED_MESSAGE);
            return;
        }

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
            const outcome = await invokeKcbpCall(tab, editorMode, {
                commonParams: commonParams.length > 0 ? commonParams : undefined,
            });
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
            notify(feedback.level, feedback.message);

            pushLog({
                caseName,
                msgtype: outcome.msgtype || msgtype,
                success: feedback.level === 'success' || feedback.level === 'info',
                timecost: outcome.response.stats?.timecost,
                rows: outcome.response.stats?.rows,
                message: feedback.message,
                timestamp: Date.now(),
            });

            const addressParts = parseKcbpAddress(tab.address);
            const project = activeProjectRef.current;
            const environment = getActiveKcxpEnvironment(
                envRef.current.kcxpEnvironments,
                envRef.current.activeKcxpEnvironmentId,
            );
            const responseStatus = parseKcbpResponseStatus(outcome.response);
            addEntry({
                id: createRequestHistoryId(),
                timestamp: Date.now(),
                projectId: project.id,
                projectName: project.name,
                caseId: tab.id,
                caseName,
                mode: editorMode,
                environmentId: environment.id,
                environmentName: environment.name,
                request: {
                    address: tab.address,
                    msgtype: outcome.msgtype || msgtype,
                    queue: addressParts.queue.trim() || undefined,
                    timeout: addressParts.timeout.trim() || undefined,
                    params: outcome.effectiveParams ?? tab.params,
                    script: tab.script,
                    runInput: tab.runInput,
                },
                response: outcome.response,
                outcome: {
                    success: feedback.level === 'success' || feedback.level === 'info',
                    rows: outcome.response.stats?.rows,
                    timecost: outcome.response.stats?.timecost,
                    dataSize: JSON.stringify(outcome.response.resultSets).length,
                    businessCode: responseStatus.businessCode,
                    transportCode: responseStatus.transportCode,
                    message: feedback.message,
                    scriptError: outcome.scriptError,
                    scriptTest: outcome.scriptTest,
                    callSteps: outcome.callSteps,
                    scriptConsole: outcome.scriptConsole,
                },
            });
        } catch (error) {
            if (callId !== callGenerationRef.current || isKcbpCancelled(error)) return;

            const errorMessage = error instanceof Error ? error.message : String(error);
            setResponse(tab.id, {
                code: '-1',
                message: errorMessage,
                resultSets: [],
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
            notify('error', errorMessage);

            pushLog({
                caseName,
                msgtype,
                success: false,
                message: errorMessage,
                timestamp: Date.now(),
            });

            const addressParts = parseKcbpAddress(tab.address);
            const project = activeProjectRef.current;
            const environment = getActiveKcxpEnvironment(
                envRef.current.kcxpEnvironments,
                envRef.current.activeKcxpEnvironmentId,
            );
            const errorResponse = {
                code: '-1',
                message: errorMessage,
                resultSets: [],
                calledAt: Date.now(),
            };
            addEntry({
                id: createRequestHistoryId(),
                timestamp: Date.now(),
                projectId: project.id,
                projectName: project.name,
                caseId: tab.id,
                caseName,
                mode: editorMode,
                environmentId: environment.id,
                environmentName: environment.name,
                request: {
                    address: tab.address,
                    msgtype,
                    queue: addressParts.queue.trim() || undefined,
                    timeout: addressParts.timeout.trim() || undefined,
                    params: tab.params,
                    script: tab.script,
                    runInput: tab.runInput,
                },
                response: errorResponse,
                outcome: {
                    success: false,
                    dataSize: 0,
                    transportCode: '-1',
                    message: errorMessage,
                },
            });
        } finally {
            if (callId === callGenerationRef.current) {
                runningCaseIdRef.current = null;
                setRunningCaseId(null);
            }
        }
    }, [addEntry, cancelInFlight, notify, pushLog, setResponse, setScriptConsole, updateTab]);

    const value = useMemo(
        () => ({
            runningCaseId,
            run,
            cancel,
        }),
        [runningCaseId, run, cancel],
    );

    const feedbackBridge = useMemo(() => ({ register: registerFeedback }), [registerFeedback]);

    return (
        <KcbpFeedbackBridgeContext.Provider value={feedbackBridge}>
            <KcbpCallContext.Provider value={value}>{children}</KcbpCallContext.Provider>
        </KcbpFeedbackBridgeContext.Provider>
    );
}
