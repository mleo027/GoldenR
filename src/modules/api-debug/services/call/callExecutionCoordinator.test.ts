import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyProject } from '../../constants/workspace';
import { DEFAULT_API_DEBUG_ENV } from '../../constants/apiDebugEnv';
import type { KcbpCallOutcome } from '../kcbp/types';

const invokeApiCall = vi.hoisted(() => vi.fn());
const cancelKcbpCall = vi.hoisted(() => vi.fn());
const canInvokeKcbp = vi.hoisted(() => vi.fn(() => true));

vi.mock('./callService', () => ({ invokeApiCall }));
vi.mock('../call', () => ({
    canInvokeKcbp,
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
        canInvokeKcbp.mockReset().mockReturnValue(true);
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
        expect(deps.updateTab).toHaveBeenCalledTimes(1);
        expect(deps.updateTab).toHaveBeenCalledWith('case-2', expect.any(Object));
        expect(deps.updateTab).not.toHaveBeenCalledWith('case-1', expect.anything());
        expect(deps.setResponse).toHaveBeenCalledTimes(1);
        expect(deps.setResponse).toHaveBeenCalledWith('case-2', expect.any(Object));
        expect(coordinator.getRunningCaseId()).toBeNull();
    });

    it('reports unavailable Electron without flushing or invoking', async () => {
        const deps = createDeps();
        canInvokeKcbp.mockReturnValue(false);
        const coordinator = createCallExecutionCoordinator(deps);

        await coordinator.run(createSnapshot(1));

        expect(deps.notifyUnavailable).toHaveBeenCalledOnce();
        expect(invokeApiCall).not.toHaveBeenCalled();
        canInvokeKcbp.mockReturnValue(true);
    });

    it('rejects a case without msgtype before invoking', async () => {
        const deps = createDeps();
        const snapshot = createSnapshot(1);
        snapshot.tab.address = '127.0.0.1:21000/';
        snapshot.tab.params = [];

        await createCallExecutionCoordinator(deps).run(snapshot);

        expect(deps.notifyMissingMsgtype).toHaveBeenCalledWith('missing msgtype');
        expect(invokeApiCall).not.toHaveBeenCalled();
    });

    it('cancels a second run of the same case and clears running state', async () => {
        let resolveCall!: (value: KcbpCallOutcome) => void;
        invokeApiCall.mockReturnValue(
            new Promise((resolve) => {
                resolveCall = resolve;
            }),
        );
        const deps = createDeps();
        const coordinator = createCallExecutionCoordinator(deps);
        const snapshot = createSnapshot(1);

        const first = coordinator.run(snapshot);
        await Promise.resolve();
        await coordinator.run(snapshot);
        resolveCall(successOutcome());
        await first;

        expect(cancelKcbpCall).toHaveBeenCalledOnce();
        expect(deps.setRunningCaseId).toHaveBeenLastCalledWith(null);
        expect(coordinator.getRunningCaseId()).toBeNull();
    });

    it('coordinates failures and clears running state in finally', async () => {
        invokeApiCall.mockRejectedValue(new Error('network failed'));
        const deps = createDeps();

        await createCallExecutionCoordinator(deps).run(createSnapshot(1));

        expect(deps.setResponse).toHaveBeenCalledOnce();
        expect(deps.pushLog).toHaveBeenCalled();
        expect(deps.setRunningCaseId).toHaveBeenLastCalledWith(null);
    });
});
