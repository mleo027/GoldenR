import type { AppEnv } from '../types';
import { DEFAULT_APP_ENV } from '../constants/appEnv';
import { APP_ENV_FILE, SETTINGS_FILE } from '@/config/files';
import { UI_DEBOUNCE_MS } from '../constants/ui';
import { resolveActiveModuleId } from '../platform/registry/helpers';
import { getElectronAPI } from '../lib/electron';
const LEGACY_SETTINGS_BACKUP_FILE = 'settings.preferences.legacy-migrated.json';
const SAVE_DEBOUNCE_MS = UI_DEBOUNCE_MS.save;

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingEnv: AppEnv | null = null;

interface LegacyAppEnvFields {
    editorMode?: string;
    kcxpEnvironments?: unknown;
    activeKcxpEnvironmentId?: string;
    preferences?: Partial<AppEnv & LegacyAppEnvFields>;
}

function isAppEnv(value: unknown): value is Partial<AppEnv> & LegacyAppEnvFields {
    if (!value || typeof value !== 'object') return false;
    const env = value as Partial<AppEnv> & LegacyAppEnvFields;
    return (
        (env.compactMode === undefined || typeof env.compactMode === 'boolean') &&
        (env.showRowIndex === undefined || typeof env.showRowIndex === 'boolean') &&
        (env.autoSave === undefined || typeof env.autoSave === 'boolean') &&
        (env.darkMode === undefined || typeof env.darkMode === 'boolean') &&
        (env.activeModuleId === undefined || typeof env.activeModuleId === 'string') &&
        (env.sidebarVisible === undefined || typeof env.sidebarVisible === 'boolean')
    );
}

export function mergeAppEnv(partial?: Partial<AppEnv>): AppEnv {
    return {
        ...DEFAULT_APP_ENV,
        compactMode: partial?.compactMode ?? DEFAULT_APP_ENV.compactMode,
        showRowIndex: partial?.showRowIndex ?? DEFAULT_APP_ENV.showRowIndex,
        autoSave: partial?.autoSave ?? DEFAULT_APP_ENV.autoSave,
        darkMode: partial?.darkMode ?? DEFAULT_APP_ENV.darkMode,
        sidebarVisible: partial?.sidebarVisible ?? DEFAULT_APP_ENV.sidebarVisible,
        activeModuleId: resolveActiveModuleId(partial?.activeModuleId),
    };
}

function toPersistedAppEnv(env: AppEnv): AppEnv {
    return mergeAppEnv(env);
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

function stripLegacyPreferences(settings: unknown): unknown {
    if (!settings || typeof settings !== 'object') return settings;
    const next = { ...(settings as Record<string, unknown>) };
    delete next.preferences;
    return next;
}

async function migrateFromLegacySettings(): Promise<AppEnv | null> {
    const settings = await readJson(SETTINGS_FILE);
    if (!settings || typeof settings !== 'object') return null;

    const legacyPreferences = (settings as LegacyAppEnvFields).preferences;
    if (!legacyPreferences || typeof legacyPreferences !== 'object') return null;

    const env = mergeAppEnv({
        compactMode: legacyPreferences.compactMode,
        showRowIndex: legacyPreferences.showRowIndex,
        autoSave: legacyPreferences.autoSave,
        darkMode: legacyPreferences.darkMode,
    });
    await writeJson(LEGACY_SETTINGS_BACKUP_FILE, settings);
    await writeJson(APP_ENV_FILE, env);
    await writeJson(SETTINGS_FILE, stripLegacyPreferences(settings));
    return env;
}

export async function loadAppEnv(): Promise<AppEnv> {
    const cached = await readJson(APP_ENV_FILE);
    if (isAppEnv(cached)) {
        return mergeAppEnv(cached);
    }

    const migrated = await migrateFromLegacySettings();
    if (migrated) return migrated;

    return { ...DEFAULT_APP_ENV };
}

let appEnvLoadPromise: Promise<AppEnv> | null = null;

/** 应用启动时尽早调用，与 React 挂载并行读盘 */
export function preloadAppEnv(): Promise<AppEnv> {
    if (!appEnvLoadPromise) {
        appEnvLoadPromise = loadAppEnv();
    }
    return appEnvLoadPromise;
}

function scheduleAppEnvSave(env: AppEnv): void {
    pendingEnv = toPersistedAppEnv(env);
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        const api = getElectronAPI();
        if (pendingEnv && api) {
            api.writeJsonFile(APP_ENV_FILE, pendingEnv).catch(console.error);
        }
        pendingEnv = null;
        saveTimer = null;
    }, SAVE_DEBOUNCE_MS);
}

export function saveAppEnv(env: AppEnv): void {
    scheduleAppEnvSave(env);
}

export function flushPendingAppEnvSave(): void {
    if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
    }
    const api = getElectronAPI();
    if (pendingEnv && api) {
        void api.writeJsonFile(APP_ENV_FILE, pendingEnv);
        pendingEnv = null;
    }
}

export async function flushPendingAppEnvSaveAsync(): Promise<void> {
    if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
    }
    const api = getElectronAPI();
    if (pendingEnv && api) {
        await api.writeJsonFile(APP_ENV_FILE, pendingEnv);
        pendingEnv = null;
    }
}
