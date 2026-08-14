import type { ApiDebugEnv } from '../types';
import { API_DEBUG_ENV_FILE, APP_ENV_FILE } from '@/config/files';
import { DEFAULT_API_DEBUG_ENV } from '@/config/api-debug/defaults';
import { UI_DEBOUNCE_MS } from '../../../constants/ui';
import {
    normalizeKcxpEnvironments,
    resolveActiveKcxpEnvironmentId,
} from '../utils/workspace/kcxpEnvironment';
import { getElectronAPI } from '../../../lib/electron';
const LEGACY_APP_ENV_BACKUP_FILE = 'app.api-debug.legacy-migrated.json';
const SAVE_DEBOUNCE_MS = UI_DEBOUNCE_MS.save;

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingEnv: ApiDebugEnv | null = null;

interface LegacyAppEnvFields {
    editorMode?: string;
    kcxpEnvironments?: unknown;
    activeKcxpEnvironmentId?: string;
}

function isApiDebugEnv(value: unknown): value is Partial<ApiDebugEnv> {
    if (!value || typeof value !== 'object') return false;
    const env = value as Partial<ApiDebugEnv>;
    return (
        (env.editorMode === undefined || env.editorMode === 'ui' || env.editorMode === 'script') &&
        (env.kcxpEnvironments === undefined || Array.isArray(env.kcxpEnvironments)) &&
        (env.activeKcxpEnvironmentId === undefined ||
            typeof env.activeKcxpEnvironmentId === 'string')
    );
}

function isLegacyAppEnv(value: unknown): value is LegacyAppEnvFields {
    if (!value || typeof value !== 'object') return false;
    const env = value as LegacyAppEnvFields;
    return (
        env.editorMode !== undefined ||
        env.kcxpEnvironments !== undefined ||
        env.activeKcxpEnvironmentId !== undefined
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
    };
}

async function readJson(fileName: string): Promise<unknown> {
    const api = getElectronAPI();
    if (!api) return null;
    try {
        return await api.readJsonFile(fileName, false);
    } catch {
        return null;
    }
}

async function writeJson(fileName: string, data: unknown): Promise<void> {
    const api = getElectronAPI();
    if (!api) return;
    await api.writeJsonFile(fileName, data);
}

function stripLegacyApiDebugFields(appEnv: unknown): unknown {
    if (!appEnv || typeof appEnv !== 'object') return appEnv;
    const next = { ...(appEnv as Record<string, unknown>) };
    delete next.editorMode;
    delete next.kcxpEnvironments;
    delete next.activeKcxpEnvironmentId;
    return next;
}

async function migrateFromAppJson(): Promise<ApiDebugEnv | null> {
    const appEnv = await readJson(APP_ENV_FILE);
    if (!isLegacyAppEnv(appEnv)) return null;

    const env = mergeApiDebugEnv({
        editorMode:
            appEnv.editorMode === 'script' || appEnv.editorMode === 'ui'
                ? appEnv.editorMode
                : appEnv.editorMode === 'tcd'
                  ? 'ui'
                  : undefined,
        kcxpEnvironments: appEnv.kcxpEnvironments as ApiDebugEnv['kcxpEnvironments'] | undefined,
        activeKcxpEnvironmentId: appEnv.activeKcxpEnvironmentId,
    });
    await writeJson(LEGACY_APP_ENV_BACKUP_FILE, appEnv);
    await writeJson(API_DEBUG_ENV_FILE, env);
    await writeJson(APP_ENV_FILE, stripLegacyApiDebugFields(appEnv));
    return env;
}

export async function loadApiDebugEnv(): Promise<ApiDebugEnv> {
    const cached = await readJson(API_DEBUG_ENV_FILE);
    if (isApiDebugEnv(cached)) {
        return mergeApiDebugEnv(cached);
    }

    const migrated = await migrateFromAppJson();
    if (migrated) return migrated;

    return { ...DEFAULT_API_DEBUG_ENV };
}

function scheduleApiDebugEnvSave(env: ApiDebugEnv): void {
    pendingEnv = env;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        const api = getElectronAPI();
        if (pendingEnv && api) {
            api.writeJsonFile(API_DEBUG_ENV_FILE, pendingEnv).catch(console.error);
        }
        pendingEnv = null;
        saveTimer = null;
    }, SAVE_DEBOUNCE_MS);
}

export function saveApiDebugEnv(env: ApiDebugEnv): void {
    scheduleApiDebugEnvSave(env);
}

export function flushPendingApiDebugEnvSave(): void {
    if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
    }
    const api = getElectronAPI();
    if (pendingEnv && api) {
        void api.writeJsonFile(API_DEBUG_ENV_FILE, pendingEnv);
        pendingEnv = null;
    }
}
