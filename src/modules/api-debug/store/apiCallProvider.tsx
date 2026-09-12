import { useCallback, useMemo, useRef, type ReactNode } from 'react';
import { useTabsActions, useActiveTab } from './useTabs';
import { useApiDebugEnv } from './useApiDebugEnv';
import { useCommonParamsState } from './useCommonParams';
import { useResponseActions } from './useResponse';
import { useScriptConsoleActions } from './useScriptConsole';
import { useRunLogActions } from './useRunLog';
import { useRequestHistoryActions } from './useRequestHistory';
import { useApiCallStore } from './apiCallStore';
import { ApiCallContext } from './ApiCallContext';
import {
    KcbpFeedbackBridgeContext,
    type KcbpFeedbackHandler,
    type KcbpFeedbackLevel,
} from './kcbpFeedbackContext';
import {
    createCallExecutionCoordinator,
    type CallExecutionCoordinatorDeps,
} from '../services/call/callExecutionCoordinator';

export function ApiCallProvider({ children }: { children: ReactNode }) {
    const { updateCaseById } = useTabsActions();
    const { env } = useApiDebugEnv();
    const { activeProject, activeTab, activeCaseIndex } = useActiveTab();
    const { sets: commonSets } = useCommonParamsState();
    const { setResponse } = useResponseActions();
    const { setScriptConsole } = useScriptConsoleActions();
    const { pushLog } = useRunLogActions();
    const { addEntry } = useRequestHistoryActions();
    const traceEnabled = useApiCallStore((state) => state.traceEnabled);
    const setRunningCaseId = useApiCallStore((state) => state.setRunningCaseId);
    const feedbackRef = useRef<KcbpFeedbackHandler | null>(null);

    const notify = useCallback((level: KcbpFeedbackLevel, message: string) => {
        feedbackRef.current?.({ level, content: message });
    }, []);
    const registerFeedback = useCallback((handler: KcbpFeedbackHandler | null) => {
        feedbackRef.current = handler;
    }, []);
    const coordinatorDepsRef = useRef<CallExecutionCoordinatorDeps>({
        updateTab: updateCaseById,
        setResponse,
        setScriptConsole,
        pushLog,
        addHistory: addEntry,
        notify,
        setRunningCaseId,
        notifyUnavailable: (message) => notify('error', message),
        notifyMissingMsgtype: (message) => notify('warning', message),
    });
    coordinatorDepsRef.current = {
        updateTab: updateCaseById,
        setResponse,
        setScriptConsole,
        pushLog,
        addHistory: addEntry,
        notify,
        setRunningCaseId,
        notifyUnavailable: (message) => notify('error', message),
        notifyMissingMsgtype: (message) => notify('warning', message),
    };
    const coordinatorRef = useRef<ReturnType<typeof createCallExecutionCoordinator> | null>(null);
    if (!coordinatorRef.current) {
        coordinatorRef.current = createCallExecutionCoordinator({
            updateTab: (caseId, updates) => coordinatorDepsRef.current.updateTab(caseId, updates),
            setResponse: (caseId, response) =>
                coordinatorDepsRef.current.setResponse(caseId, response),
            setScriptConsole: (caseId, snapshot) =>
                coordinatorDepsRef.current.setScriptConsole(caseId, snapshot),
            pushLog: (entry) => coordinatorDepsRef.current.pushLog(entry),
            addHistory: (entry) => coordinatorDepsRef.current.addHistory(entry),
            notify: (level, message) => coordinatorDepsRef.current.notify(level, message),
            setRunningCaseId: (caseId) => coordinatorDepsRef.current.setRunningCaseId(caseId),
            notifyUnavailable: (message) => coordinatorDepsRef.current.notifyUnavailable(message),
            notifyMissingMsgtype: (message) =>
                coordinatorDepsRef.current.notifyMissingMsgtype(message),
        });
    }
    const coordinator = coordinatorRef.current;
    const run = useCallback(() => {
        return coordinator.run({
            tab: activeTab,
            project: activeProject,
            caseIndex: activeCaseIndex,
            commonSets,
            env,
            traceEnabled,
        });
    }, [activeCaseIndex, activeProject, activeTab, commonSets, coordinator, env, traceEnabled]);
    const runWithTrace = useCallback(
        () =>
            coordinator.run({
                tab: activeTab,
                project: activeProject,
                caseIndex: activeCaseIndex,
                commonSets,
                env,
                traceEnabled: true,
            }),
        [activeCaseIndex, activeProject, activeTab, commonSets, coordinator, env],
    );
    const cancel = useCallback(() => coordinator.cancel(), [coordinator]);
    const value = useMemo(() => ({ run, runWithTrace, cancel }), [cancel, run, runWithTrace]);
    const feedbackBridge = useMemo(() => ({ register: registerFeedback }), [registerFeedback]);

    return (
        <KcbpFeedbackBridgeContext.Provider value={feedbackBridge}>
            <ApiCallContext.Provider value={value}>{children}</ApiCallContext.Provider>
        </KcbpFeedbackBridgeContext.Provider>
    );
}
