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
        readJsonFile: vi.fn(async (filePath: string) => files[filePath] ?? null),
        writeJsonFile: vi.fn(async (filePath: string, data: unknown) => {
            files[filePath] = data;
        }),
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

    it('migrates legacy settings.preferences into app.json and strips the old field', async () => {
        const files: Record<string, unknown> = {
            'settings.json': {
                activeProjectIndex: 1,
                activeCaseIndex: 2,
                expandedProjectIds: ['p1'],
                openCaseIds: ['c1'],
                preferences: {
                    darkMode: true,
                    compactMode: true,
                    autoSave: false,
                    showRowIndex: false,
                },
            },
        };
        const electronAPI = createElectronApiMock(files);
        vi.stubGlobal('window', { electronAPI });

        const loaded = await loadAppEnv();

        expect(loaded.darkMode).toBe(true);
        expect(loaded.compactMode).toBe(true);
        expect(files['app.json']).toMatchObject({
            darkMode: true,
            compactMode: true,
            autoSave: false,
            showRowIndex: false,
        });
        expect(files['settings.preferences.legacy-migrated.json']).toEqual({
            activeProjectIndex: 1,
            activeCaseIndex: 2,
            expandedProjectIds: ['p1'],
            openCaseIds: ['c1'],
            preferences: {
                darkMode: true,
                compactMode: true,
                autoSave: false,
                showRowIndex: false,
            },
        });
        expect(files['settings.json']).toEqual({
            activeProjectIndex: 1,
            activeCaseIndex: 2,
            expandedProjectIds: ['p1'],
            openCaseIds: ['c1'],
        });
    });
});
