import type { AppEnv } from '../types';
import { DEFAULT_APP_ENV } from '../constants/appEnv';
import { UI_DEBOUNCE_MS } from '../constants/ui';
import { resolveActiveModuleId } from '../platform/registry/helpers';
import { configStorage } from '../services/persistence/configStorage';
import { DebounceWriter } from '../services/persistence/debounceWriter';
const SAVE_DEBOUNCE_MS = UI_DEBOUNCE_MS.save;

const saveWriter = new DebounceWriter<AppEnv>({
    write: (env) => configStorage.writeAppEnv(env),
    delayMs: SAVE_DEBOUNCE_MS,
    onError: console.error,
});

function isAppEnv(value: unknown): value is Partial<AppEnv> {
    if (!value || typeof value !== 'object') return false;
    const env = value as Partial<AppEnv>;
    return (
        (env.compactMode === undefined || typeof env.compactMode === 'boolean') &&
        (env.showRowIndex === undefined || typeof env.showRowIndex === 'boolean') &&
        (env.autoSave === undefined || typeof env.autoSave === 'boolean') &&
        (env.darkMode === undefined || typeof env.darkMode === 'boolean') &&
        (env.accentColor === undefined ||
            (typeof env.accentColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(env.accentColor))) &&
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

export async function loadAppEnv(): Promise<AppEnv> {
    const cached = await configStorage.readAppEnv();
    if (isAppEnv(cached)) {
        return mergeAppEnv(cached);
    }

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
