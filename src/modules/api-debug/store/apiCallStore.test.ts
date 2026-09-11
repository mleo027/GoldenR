import { beforeEach, describe, expect, it } from 'vitest';
import { useApiCallStore } from './apiCallStore';

describe('apiCallStore', () => {
    beforeEach(() => {
        useApiCallStore.setState({ runningCaseId: null, traceEnabled: false });
    });

    it('keeps transient execution state independent from React providers', () => {
        useApiCallStore.getState().setRunningCaseId('case-1');
        useApiCallStore.getState().setTraceEnabled(true);

        expect(useApiCallStore.getState()).toMatchObject({
            runningCaseId: 'case-1',
            traceEnabled: true,
        });
    });
});
