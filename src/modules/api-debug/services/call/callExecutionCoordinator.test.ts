import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyProject } from '../../constants/workspace';
import { DEFAULT_API_DEBUG_ENV } from '../../constants/apiDebugEnv';
import type { KcbpCallOutcome } from '../kcbp/types';

const invokeApiCall = vi.hoisted(() => vi.fn());
const cancelKcbpCall = vi.hoisted(() => vi.fn());

vi.mock('./callService', () => ({ invokeApiCall }));
vi.mock('../call', () => ({
    canInvokeKcbp: () => true,
    cancelKcbpCall,
    KCBP_MSGTYPE_REQUIRED_MESSAGE: 'missing msgtype',
}));
vi.mock('../../utils/workspace/tabDraftRegistry', () => ({
    flushAllTabDrafts: () => ({}),
}));

import {
    createCallExecutionCoordinator,
    type CallExecutionCoordinatorDeps,
} from './callExecutionCoordinator';

function createDeps(): CallExecutionCoordinatorDeps {
    return {
        updateTab: vi.fn(),
        setResponse: vi.fn(),
        setScriptConsole: vi.fn(),
        pushLog: vi.fn(),
        addHistory: vi.fn(),
        notify: vi.fn(),
        setRunningCaseId: vi.fn(),
        notifyUnavailable: vi.fn(),
        notifyMissingMsgtype: vi.fn(),
    };
}

function createSnapshot(caseNumber: number) {
    const project = createEmptyProject(caseNumber);
    const tab = {
        ...project.cases[0],
        id: `case-${caseNumber}`,
        address: `127.0.0.1:21000/${150500 + caseNumber}`,
    };
    return {
        tab,
        project: { ...project, cases: [tab] },
        caseIndex: 0,
        commonSets: [],
        env: DEFAULT_API_DEBUG_ENV,
        traceEnabled: false,
    };
}

function successOutcome(): KcbpCallOutcome {
    return {
        response: { code: '0', message: 'ok', resultSets: [], calledAt: Date.now() },
        nextParams: [],
        status: {
            kind: 'success',
            businessCode: '0',
            businessMsg: 'ok',
            transportCode: '0',
            transportMsg: 'ok',
            hasBusinessRow: false,
        },
        missingParam: null,
        msgtype: '150502',
    };
}

describe('createCallExecutionCoordinator', () => {
    beforeEach(() => {
        invokeApiCall.mockReset();
        cancelKcbpCall.mockReset();
    });

    it('cancels the previous case and ignores its stale result', async () => {
        let resolveFirst!: (value: KcbpCallOutcome) => void;
        invokeApiCall
            .mockImplementationOnce(
                () =>
                    new Promise<KcbpCallOutcome>((resolve) => {
                        resolveFirst = resolve;
                    }),
            )
            .mockResolvedValueOnce(successOutcome());
        const deps = createDeps();
        const coordinator = createCallExecutionCoordinator(deps);

        const firstRun = coordinator.run(createSnapshot(1));
        await coordinator.run(createSnapshot(2));
        resolveFirst(successOutcome());
        await firstRun;

        expect(cancelKcbpCall).toHaveBeenCalledTimes(1);
        expect(deps.setResponse).toHaveBeenCalledTimes(1);
        expect(deps.setResponse).toHaveBeenCalledWith('case-2', expect.any(Object));
        expect(coordinator.getRunningCaseId()).toBeNull();
    });
});
