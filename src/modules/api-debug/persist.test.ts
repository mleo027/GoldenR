import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    flushTabs: vi.fn(),
    flushEnv: vi.fn(),
    flushSuggest: vi.fn(),
    flushDrafts: vi.fn(),
}));

vi.mock('./store/tabsData', () => ({
    flushPendingSavesAsync: mocks.flushTabs,
}));

vi.mock('./store/apiDebugEnvData', () => ({
    flushPendingApiDebugEnvSaveAsync: mocks.flushEnv,
}));

vi.mock('./store/paramSuggestData', () => ({
    flushPendingParamSuggestSaveAsync: mocks.flushSuggest,
}));

vi.mock('./utils/workspace/tabDraftRegistry', () => ({
    flushAllTabDrafts: mocks.flushDrafts,
}));

import { flushApiDebugPersistedState } from './persist';

describe('flushApiDebugPersistedState', () => {
    beforeEach(() => {
        mocks.flushTabs.mockReset();
        mocks.flushEnv.mockReset();
        mocks.flushSuggest.mockReset();
        mocks.flushDrafts.mockReset();
        mocks.flushDrafts.mockReturnValue({});
    });

    it('starts all api-debug flushes concurrently', async () => {
        mocks.flushTabs.mockResolvedValue(undefined);
        mocks.flushEnv.mockResolvedValue(undefined);
        mocks.flushSuggest.mockResolvedValue(undefined);

        await flushApiDebugPersistedState();

        expect(mocks.flushDrafts).toHaveBeenCalledOnce();
        expect(mocks.flushTabs).toHaveBeenCalledOnce();
        expect(mocks.flushEnv).toHaveBeenCalledOnce();
        expect(mocks.flushSuggest).toHaveBeenCalledOnce();
    });

    it('still starts sibling flushes when one api-debug flush rejects', async () => {
        mocks.flushTabs.mockResolvedValue(undefined);
        mocks.flushEnv.mockRejectedValue(new Error('env failed'));
        mocks.flushSuggest.mockResolvedValue(undefined);

        await expect(flushApiDebugPersistedState()).rejects.toThrow('env failed');
        expect(mocks.flushTabs).toHaveBeenCalledOnce();
        expect(mocks.flushSuggest).toHaveBeenCalledOnce();
    });
});
