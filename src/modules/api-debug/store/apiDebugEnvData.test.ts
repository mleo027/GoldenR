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
            readApiDebugEnvironments: vi.fn(async () => files.apiDebugEnvironments ?? null),
            writeApiDebugEnvironments: vi.fn(async (data: unknown) => {
                files.apiDebugEnvironments = data;
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

    it('defaults paramsRawMode to false', () => {
        expect(mergeApiDebugEnv().paramsRawMode).toBe(false);
        expect(mergeApiDebugEnv({ paramsRawMode: undefined }).paramsRawMode).toBe(false);
    });

    it('preserves raw params display mode when enabled', () => {
        expect(mergeApiDebugEnv({ paramsRawMode: true }).paramsRawMode).toBe(true);
    });

    it('normalizes non-boolean paramsRawMode to false', () => {
        expect(mergeApiDebugEnv({ paramsRawMode: 'yes' as unknown as boolean }).paramsRawMode).toBe(
            false,
        );
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

    it('returns defaults when no API debug environment is stored', async () => {
        const files: Record<string, unknown> = {};
        const electronAPI = createElectronApiMock(files);
        vi.stubGlobal('window', { electronAPI });

        const loaded = await loadApiDebugEnv();

        expect(loaded).toEqual(DEFAULT_API_DEBUG_ENV);
    });
});
