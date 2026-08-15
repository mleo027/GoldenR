import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    flushAppEnv: vi.fn(),
    flushModule: vi.fn(),
}));

vi.mock('../store/appEnvData', () => ({
    flushPendingAppEnvSaveAsync: mocks.flushAppEnv,
}));

vi.mock('../platform/registry/app-modules', () => ({
    APP_MODULES: [{ flushPersistedState: mocks.flushModule }],
}));

import { flushAllPersistedState } from './persistFlush';

describe('flushAllPersistedState', () => {
    beforeEach(() => {
        mocks.flushAppEnv.mockReset();
        mocks.flushModule.mockReset();
    });

    it('runs app env and module flushes together', async () => {
        mocks.flushAppEnv.mockResolvedValue(undefined);
        mocks.flushModule.mockResolvedValue(undefined);

        await flushAllPersistedState();

        expect(mocks.flushAppEnv).toHaveBeenCalledOnce();
        expect(mocks.flushModule).toHaveBeenCalledOnce();
    });

    it('still starts module flushes when app env flush rejects', async () => {
        mocks.flushAppEnv.mockRejectedValue(new Error('app env failed'));
        mocks.flushModule.mockResolvedValue(undefined);

        await expect(flushAllPersistedState()).rejects.toThrow('app env failed');
        expect(mocks.flushModule).toHaveBeenCalledOnce();
    });
});
