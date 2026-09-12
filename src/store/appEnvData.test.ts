import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPendingAppEnvSaveAsync, loadAppEnv, mergeAppEnv } from './appEnvData';
import { DEFAULT_APP_ENV } from '../constants/appEnv';
import { getDefaultModuleId } from '../platform/registry/helpers';

afterEach(async () => {
    await flushPendingAppEnvSaveAsync();
    vi.unstubAllGlobals();
});

function createElectronApiMock(files: Record<string, unknown>) {
    return {
        config: {
            readAppEnv: vi.fn(async () => files.appEnv ?? null),
            writeAppEnv: vi.fn(async (data: unknown) => {
                files.appEnv = data;
            }),
        },
    };
}

describe('mergeAppEnv', () => {
    it('returns defaults when partial is empty', () => {
        expect(mergeAppEnv()).toEqual(DEFAULT_APP_ENV);
    });

    it('merges theme and layout preferences', () => {
        expect(
            mergeAppEnv({
                darkMode: true,
                compactMode: true,
                showRowIndex: false,
                autoSave: false,
            }),
        ).toEqual({
            ...DEFAULT_APP_ENV,
            darkMode: true,
            compactMode: true,
            showRowIndex: false,
            autoSave: false,
        });
    });

    it('falls back activeModuleId when blank', () => {
        expect(mergeAppEnv({ activeModuleId: '   ' }).activeModuleId).toBe(getDefaultModuleId());
        expect(mergeAppEnv({ activeModuleId: 'api-debug' }).activeModuleId).toBe('api-debug');
    });

    it('falls back activeModuleId when unknown', () => {
        expect(mergeAppEnv({ activeModuleId: 'removed-module' }).activeModuleId).toBe(
            getDefaultModuleId(),
        );
    });

    it('defaults activeModuleId to the first registered module', () => {
        expect(DEFAULT_APP_ENV.activeModuleId).toBe(getDefaultModuleId());
    });

    it('merges sidebarVisible with default true', () => {
        expect(mergeAppEnv({ sidebarVisible: false }).sidebarVisible).toBe(false);
        expect(mergeAppEnv().sidebarVisible).toBe(true);
    });

    it('returns defaults when no app environment is stored', async () => {
        const files: Record<string, unknown> = {};
        const electronAPI = createElectronApiMock(files);
        vi.stubGlobal('window', { electronAPI });

        const loaded = await loadAppEnv();

        expect(loaded).toEqual(DEFAULT_APP_ENV);
    });
});
