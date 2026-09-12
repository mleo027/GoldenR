import type { ProjectData, ResponseData, TabData, EditorMode } from '../../types/workspace';
import type { ScriptConsoleSnapshot } from '../../types/scriptConsole';
import type { KcbpCallOutcome } from '../kcbp/types';
import type { RunLogEntry } from '../../store/RunLogContext';
import type { RequestHistoryEntry, RequestHistoryOutcome } from '../../types/requestHistory';
import { createRequestHistoryId } from '../../store/requestHistoryData';
import { getKcbpCallFeedback } from '../kcbp/feedback';
import { parseKcbpAddress } from '../../utils/kcbp/kcbpAddress';
import { parseKcbpResponseStatus } from '../../utils/kcbp/kcbpResponse';
import { truncateResponseForHistory } from '../../utils/historyResponse';

export interface CallResultCoordinatorDeps {
    updateTab(caseId: string, updates: Partial<TabData>): void;
    setResponse(caseId: string, response: ResponseData): void;
    setScriptConsole(caseId: string, snapshot: ScriptConsoleSnapshot): void;
    pushLog(entry: Omit<RunLogEntry, 'id'>): void;
    addHistory(entry: RequestHistoryEntry): void;
    notify(level: 'success' | 'info' | 'warning' | 'error', message: string): void;
}

export interface CallResultContext {
    tab: TabData;
    project: ProjectData;
    caseName: string;
    msgtype: string;
    mode: EditorMode;
    environment: { id: string; name: string };
}

function writeHistory(
    deps: CallResultCoordinatorDeps,
    context: CallResultContext,
    response: ResponseData,
    outcome: RequestHistoryOutcome,
    params: TabData['params'],
): void {
    const address = parseKcbpAddress(context.tab.address);
    deps.addHistory({
        id: createRequestHistoryId(),
        timestamp: Date.now(),
        projectId: context.project.id,
        projectName: context.project.name,
        caseId: context.tab.id,
        caseName: context.caseName,
        mode: context.mode,
        environmentId: context.environment.id,
        environmentName: context.environment.name,
        request: {
            address: context.tab.address,
            msgtype: context.msgtype,
            queue: address.queue.trim() || undefined,
            timeout: address.timeout.trim() || undefined,
            params,
            script: context.tab.script,
            runInput: context.tab.runInput,
        },
        response,
        outcome,
    });
}

export function coordinateCallSuccess(
    deps: CallResultCoordinatorDeps,
    context: CallResultContext,
    outcome: KcbpCallOutcome,
): void {
    const feedback = getKcbpCallFeedback(outcome);
    const responseStatus = parseKcbpResponseStatus(outcome.response);
    const historyResponse = truncateResponseForHistory(outcome.response);
    const msgtype = outcome.msgtype || context.msgtype;
    const success = feedback.level === 'success' || feedback.level === 'info';

    deps.updateTab(context.tab.id, {
        params: outcome.nextParams,
        ...(outcome.nextScript ? { script: outcome.nextScript } : {}),
    });
    deps.setResponse(context.tab.id, outcome.response);
    if (context.mode === 'script' && outcome.scriptConsole) {
        deps.setScriptConsole(context.tab.id, outcome.scriptConsole);
    }
    deps.notify(feedback.level, feedback.message);
    deps.pushLog({
        caseName: context.caseName,
        msgtype,
        success,
        timecost: outcome.response.stats?.timecost,
        rows: outcome.response.stats?.rows,
        message: feedback.message,
        timestamp: Date.now(),
    });
    writeHistory(
        deps,
        { ...context, msgtype },
        historyResponse,
        {
            success,
            rows: outcome.response.stats?.rows,
            timecost: outcome.response.stats?.timecost,
            dataSize: JSON.stringify(historyResponse.resultSets).length,
            businessCode: responseStatus.businessCode,
            transportCode: responseStatus.transportCode,
            message: feedback.message,
            scriptError: outcome.scriptError,
            scriptTest: outcome.scriptTest,
            callSteps: outcome.callSteps,
            scriptConsole: outcome.scriptConsole,
        },
        outcome.effectiveParams ?? context.tab.params,
    );
}

export function coordinateCallFailure(
    deps: CallResultCoordinatorDeps,
    context: CallResultContext,
    error: unknown,
): void {
    const message = error instanceof Error ? error.message : String(error);
    const response: ResponseData = {
        code: '-1',
        message,
        resultSets: [],
        calledAt: Date.now(),
    };
    deps.setResponse(context.tab.id, response);
    if (context.mode === 'script') {
        deps.setScriptConsole(context.tab.id, {
            entries: [{ level: 'error', message, timestamp: Date.now() }],
            ranAt: Date.now(),
        });
    }
    deps.notify('error', message);
    deps.pushLog({
        caseName: context.caseName,
        msgtype: context.msgtype,
        success: false,
        message,
        timestamp: Date.now(),
    });
    writeHistory(
        deps,
        context,
        response,
        { success: false, dataSize: 0, transportCode: '-1', message },
        context.tab.params,
    );
}
