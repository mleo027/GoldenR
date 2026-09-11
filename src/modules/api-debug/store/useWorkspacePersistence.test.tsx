// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_API_DEBUG_ENV } from '../constants/apiDebugEnv';
import { createInitialTabsState } from './tabsReducer';
import { useWorkspacePersistence } from './useWorkspacePersistence';

const mocks = vi.hoisted(() => ({
    flushDrafts: vi.fn(),
    flushPending: vi.fn(),
    registeredFlush: undefined as (() => Promise<void>) | undefined,
}));

vi.mock('./tabsData', async (importOriginal) => {
    const actual = await importOriginal<typeof import('./tabsData')>();
    return {
        ...actual,
        applyTabDraftsToWorkspace: (workspace: unknown) => workspace,
        flushPendingSavesAsync: mocks.flushPending,
        hashPersistedProjects: (projects: unknown) => JSON.stringify(projects),
        loadWorkspace: vi.fn().mockResolvedValue(null),
        saveProjects: vi.fn(),
        saveSettings: vi.fn(),
    };
});
vi.mock('../../../lib/persistFlush', () => ({ flushAllPersistedState: vi.fn() }));
vi.mock('../utils/workspace/tabDraftRegistry', () => ({
    flushAllTabDrafts: mocks.flushDrafts,
}));
vi.mock('./workspaceFlushRegistry', () => ({
    registerWorkspaceDraftFlusher: (flush: () => Promise<void>) => {
        mocks.registeredFlush = flush;
        return () => {
            if (mocks.registeredFlush === flush) mocks.registeredFlush = undefined;
        };
    },
}));

beforeEach(() => {
    mocks.flushDrafts.mockReset().mockReturnValue({});
    mocks.flushPending.mockReset().mockResolvedValue(undefined);
    mocks.registeredFlush = undefined;
});

describe('useWorkspacePersistence', () => {
    it('attempts pending persistence after a draft flush failure and reports both errors', async () => {
        mocks.flushDrafts.mockImplementation(() => {
            throw new Error('draft failed');
        });
        mocks.flushPending.mockRejectedValue(new Error('persist failed'));

        const { unmount } = renderHook(() =>
            useWorkspacePersistence({
                state: { ...createInitialTabsState(), loaded: true },
                dispatch: vi.fn(),
                autoSave: true,
                apiEnv: DEFAULT_API_DEBUG_ENV,
                apiEnvLoaded: true,
            }),
        );

        await expect(mocks.registeredFlush?.()).rejects.toThrow(/draft failed.*persist failed/);
        expect(mocks.flushPending).toHaveBeenCalledOnce();
        unmount();
        expect(mocks.registeredFlush).toBeUndefined();
    });
});
