import type { ApiDebugEnv } from '../types';
import { DEFAULT_API_DEBUG_ENV } from '@/config/api-debug/defaults';
import { UI_DEBOUNCE_MS } from '../../../constants/ui';
import {
    normalizeKcxpEnvironments,
    resolveActiveKcxpEnvironmentId,
} from '../utils/workspace/kcxpEnvironment';
import { configStorage } from '../../../services/persistence/configStorage';
import { DebounceWriter } from '../../../services/persistence/debounceWriter';
const SAVE_DEBOUNCE_MS = UI_DEBOUNCE_MS.save;

const saveWriter = new DebounceWriter<ApiDebugEnv>({
    write: (env) => configStorage.writeApiDebugEnvironments(env),
    delayMs: SAVE_DEBOUNCE_MS,
    onError: console.error,
});

function isApiDebugEnv(value: unknown): value is Partial<ApiDebugEnv> {
    if (!value || typeof value !== 'object') return false;
    const env = value as Partial<ApiDebugEnv>;
    return (
        (env.editorMode === undefined || env.editorMode === 'ui' || env.editorMode === 'script') &&
        (env.kcxpEnvironments === undefined || Array.isArray(env.kcxpEnvironments)) &&
        (env.activeKcxpEnvironmentId === undefined ||
            typeof env.activeKcxpEnvironmentId === 'string') &&
        (env.paramsRawMode === undefined || typeof env.paramsRawMode === 'boolean')
    );
}

export function mergeApiDebugEnv(partial?: Partial<ApiDebugEnv>): ApiDebugEnv {
    const kcxpEnvironments = normalizeKcxpEnvironments(partial?.kcxpEnvironments);
    const editorMode =
        partial?.editorMode === 'script' || partial?.editorMode === 'ui'
            ? partial.editorMode
            : partial?.editorMode === 'tcd'
              ? 'ui'
              : DEFAULT_API_DEBUG_ENV.editorMode;
    return {
        ...DEFAULT_API_DEBUG_ENV,
        ...partial,
        editorMode,
        kcxpEnvironments,
        activeKcxpEnvironmentId: resolveActiveKcxpEnvironmentId(
            kcxpEnvironments,
            partial?.activeKcxpEnvironmentId ?? DEFAULT_API_DEBUG_ENV.activeKcxpEnvironmentId,
        ),
        paramsRawMode: partial?.paramsRawMode === true,
    };
}

export async function loadApiDebugEnv(): Promise<ApiDebugEnv> {
    const cached = await configStorage.readApiDebugEnvironments();
    if (isApiDebugEnv(cached)) {
        return mergeApiDebugEnv(cached);
    }

    return { ...DEFAULT_API_DEBUG_ENV };
}

function scheduleApiDebugEnvSave(env: ApiDebugEnv): void {
    saveWriter.schedule(env);
}

export function saveApiDebugEnv(env: ApiDebugEnv): void {
    scheduleApiDebugEnvSave(env);
}

export function flushPendingApiDebugEnvSave(): void {
    void saveWriter.flush();
}

export async function flushPendingApiDebugEnvSaveAsync(): Promise<void> {
    await saveWriter.flush();
}
