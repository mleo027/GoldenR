import type { ProjectData, TabData } from '../../types/workspace';
import { invokeApiCall } from './callService';
import { canInvokeKcbp, cancelKcbpCall, KCBP_MSGTYPE_REQUIRED_MESSAGE } from '../call';
import { isKcbpCancelled } from '../../utils/kcbp/kcbpCancel';
import { flushAllTabDrafts } from '../../utils/workspace/tabDraftRegistry';
import { getActiveKcxpEnvironment } from '../../utils/workspace/kcxpEnvironment';
import {
    getCaseLabel,
    parseMsgtypeFromAddress,
    resolveMsgtypeFromParams,
} from '../../utils/workspace/caseLabel';
import { resolveCommonParamsById } from '../../utils/workspace/commonParams';
import type { CallResultContext, CallResultCoordinatorDeps } from './callResultCoordinator';
import { coordinateCallFailure, coordinateCallSuccess } from './callResultCoordinator';
import type { ApiDebugEnv } from '../../types';

export interface CallExecutionCoordinatorDeps extends CallResultCoordinatorDeps {
    setRunningCaseId(caseId: string | null): void;
    notifyUnavailable(message: string): void;
    notifyMissingMsgtype(message: string): void;
}

export interface CallExecutionSnapshot {
    tab: TabData;
    project: ProjectData;
    caseIndex: number;
    commonSets: Parameters<typeof resolveCommonParamsById>[0];
    env: ApiDebugEnv;
    traceEnabled: boolean;
}

export function createCallExecutionCoordinator(deps: CallExecutionCoordinatorDeps) {
    let generation = 0;
    let runningCaseId: string | null = null;

    const cancel = () => {
        generation += 1;
        runningCaseId = null;
        deps.setRunningCaseId(null);
        void cancelKcbpCall();
    };

    const run = async (snapshot: CallExecutionSnapshot): Promise<void> => {
        const sourceTab = snapshot.tab;
        if (runningCaseId === sourceTab.id) {
            cancel();
            return;
        }
        if (!canInvokeKcbp()) {
            deps.notifyUnavailable('当前运行环境不支持 API 调用');
            return;
        }
        if (runningCaseId) cancel();

        const drafts = flushAllTabDrafts();
        const tab: TabData = {
            ...sourceTab,
            ...(drafts.params ? { params: drafts.params } : {}),
            ...(typeof drafts.address === 'string' ? { address: drafts.address } : {}),
            ...(typeof drafts.script === 'string' ? { script: drafts.script } : {}),
        };
        const commonParams = resolveCommonParamsById(
            snapshot.commonSets,
            snapshot.project.commonParamSetId,
        );
        const msgtype =
            parseMsgtypeFromAddress(tab.address).trim() || resolveMsgtypeFromParams(tab.params);
        if (!msgtype) {
            deps.notifyMissingMsgtype(KCBP_MSGTYPE_REQUIRED_MESSAGE);
            return;
        }

        const environment = getActiveKcxpEnvironment(
            snapshot.env.kcxpEnvironments,
            snapshot.env.activeKcxpEnvironmentId,
        );
        const context: CallResultContext = {
            tab,
            project: snapshot.project,
            caseName: getCaseLabel(tab, snapshot.caseIndex),
            msgtype,
            mode: snapshot.env.editorMode,
            environment,
        };
        const callGeneration = ++generation;
        runningCaseId = tab.id;
        deps.setRunningCaseId(tab.id);
        try {
            const outcome = await invokeApiCall(tab, snapshot.env.editorMode, {
                commonParams: commonParams.length > 0 ? commonParams : undefined,
                trace: { enabled: snapshot.traceEnabled, databaseConfig: environment.database },
            });
            if (callGeneration !== generation) return;
            coordinateCallSuccess(deps, context, outcome);
        } catch (error) {
            if (callGeneration !== generation || isKcbpCancelled(error)) return;
            coordinateCallFailure(deps, context, error);
        } finally {
            if (callGeneration === generation) {
                runningCaseId = null;
                deps.setRunningCaseId(null);
            }
        }
    };

    return { run, cancel, getRunningCaseId: () => runningCaseId };
}
