import type { AppEnv } from '../types';
import { DEFAULT_APP_ENV } from '../constants/appEnv';
import { APP_ENV_FILE, SETTINGS_FILE } from '@/config/files';
import type { ConfigStorageFileName } from '@/shared/config/files';
import { UI_DEBOUNCE_MS } from '../constants/ui';
import { resolveActiveModuleId } from '../platform/registry/helpers';
import { configStorage } from '../services/persistence/configStorage';
import { DebounceWriter } from '../services/persistence/debounceWriter';
const LEGACY_SETTINGS_BACKUP_FILE = 'settings.preferences.legacy-migrated.json';
const SAVE_DEBOUNCE_MS = UI_DEBOUNCE_MS.save;

const saveWriter = new DebounceWriter<AppEnv>({
    write: (env) => configStorage.write(APP_ENV_FILE, env),
    delayMs: SAVE_DEBOUNCE_MS,
    onError: console.error,
});

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
        (env.accentColor === undefined || (typeof env.accentColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(env.accentColor))) &&
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
        accentColor: partial?.accentColor ?? DEFAULT_APP_ENV.accentColor,
        sidebarVisible: partial?.sidebarVisible ?? DEFAULT_APP_ENV.sidebarVisible,
        activeModuleId: resolveActiveModuleId(partial?.activeModuleId),
    };
}

function toPersistedAppEnv(env: AppEnv): AppEnv {
    return mergeAppEnv(env);
}

async function readJson(fileName: ConfigStorageFileName): Promise<unknown> {
    return configStorage.read(fileName);
}

async function writeJson(fileName: ConfigStorageFileName, data: unknown): Promise<void> {
    await configStorage.write(fileName, data);
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
    saveWriter.schedule(toPersistedAppEnv(env));
}

export function saveAppEnv(env: AppEnv): void {
    scheduleAppEnvSave(env);
}

export function flushPendingAppEnvSave(): void {
    void saveWriter.flush();
}

export async function flushPendingAppEnvSaveAsync(): Promise<void> {
    await saveWriter.flush();
}
