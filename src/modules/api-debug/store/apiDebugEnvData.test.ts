import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_API_DEBUG_ENV } from '@/config/api-debug/defaults';
import { flushPendingApiDebugEnvSave, loadApiDebugEnv, mergeApiDebugEnv } from './apiDebugEnvData';
import { DEFAULT_KCXP_ENVIRONMENT_ID } from '../constants/kcxpEnv';

afterEach(() => {
    flushPendingApiDebugEnvSave();
    vi.unstubAllGlobals();
});

function createElectronApiMock(files: Record<string, unknown>) {
    return {
        config: {
            read: vi.fn(async (fileName: string) => files[fileName] ?? null),
            write: vi.fn(async (fileName: string, data: unknown) => {
                files[fileName] = data;
            }),
        },
    };
}

describe('mergeApiDebugEnv', () => {
    it('returns defaults when partial is empty', () => {
        expect(mergeApiDebugEnv()).toEqual(DEFAULT_API_DEBUG_ENV);
    });

    it('preserves script editor mode', () => {
        expect(mergeApiDebugEnv({ editorMode: 'script' }).editorMode).toBe('script');
    });

    it('migrates legacy tcd editor mode to ui', () => {
        expect(mergeApiDebugEnv({ editorMode: 'tcd' as unknown as 'ui' }).editorMode).toBe('ui');
    });

    it('normalizes invalid editorMode to default', () => {
        expect(mergeApiDebugEnv({ editorMode: 'invalid' as 'ui' }).editorMode).toBe('ui');
    });

    it('resolves active KCXP environment id', () => {
        const env = mergeApiDebugEnv({
            kcxpEnvironments: [
                { id: 'env-a', name: 'A', host: '1.1.1.1:1', queue: 'q', timeout: '30' },
                { id: 'env-b', name: 'B', host: '2.2.2.2:2', queue: 'q2', timeout: '60' },
            ],
            activeKcxpEnvironmentId: 'env-b',
        });

        expect(env.activeKcxpEnvironmentId).toBe('env-b');
    });

    it('falls back to first environment when active id missing', () => {
        const env = mergeApiDebugEnv({
            kcxpEnvironments: [
                { id: 'env-a', name: 'A', host: '1.1.1.1:1', queue: 'q', timeout: '30' },
            ],
            activeKcxpEnvironmentId: 'missing',
        });

        expect(env.activeKcxpEnvironmentId).toBe('env-a');
    });

    it('uses default KCXP id when environments list is invalid', () => {
        expect(mergeApiDebugEnv({ kcxpEnvironments: [] }).activeKcxpEnvironmentId).toBe(
            DEFAULT_KCXP_ENVIRONMENT_ID,
        );
    });

    it('migrates api debug fields out of app.json and strips legacy fields', async () => {
        const files: Record<string, unknown> = {
            'app.json': {
                darkMode: true,
                editorMode: 'script',
                kcxpEnvironments: [
                    { id: 'env-a', name: 'A', host: '1.1.1.1:1', queue: 'q', timeout: '30' },
                ],
                activeKcxpEnvironmentId: 'env-a',
            },
        };
        const electronAPI = createElectronApiMock(files);
        vi.stubGlobal('window', { electronAPI });

        const loaded = await loadApiDebugEnv();

        expect(loaded.editorMode).toBe('script');
        expect(loaded.activeKcxpEnvironmentId).toBe('env-a');
        expect(files['api-debug.env.json']).toMatchObject({
            editorMode: 'script',
            activeKcxpEnvironmentId: 'env-a',
        });
        expect(files['app.api-debug.legacy-migrated.json']).toEqual({
            darkMode: true,
            editorMode: 'script',
            kcxpEnvironments: [
                { id: 'env-a', name: 'A', host: '1.1.1.1:1', queue: 'q', timeout: '30' },
            ],
            activeKcxpEnvironmentId: 'env-a',
        });
        expect(files['app.json']).toEqual({
            darkMode: true,
        });
    });
});
