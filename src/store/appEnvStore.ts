/** 全局 AppEnv：主题、布局偏好、activeModuleId；由 Zustand 管理，持久化逻辑位于 appEnvData */
import { create } from 'zustand';
import type { AppEnv } from '../types';
import { DEFAULT_APP_ENV } from '../constants/appEnv';
import { saveAppEnv, mergeAppEnv, preloadAppEnv } from './appEnvData';

export interface AppEnvStore {
    env: AppEnv;
    loaded: boolean;
    load: () => Promise<void>;
    updateEnv: <K extends keyof AppEnv>(key: K, value: AppEnv[K]) => void;
    patchEnv: (partial: Partial<AppEnv>) => void;
}

let loadPromise: Promise<void> | null = null;

function updateAndPersist(
    get: () => AppEnvStore,
    set: (value: Pick<AppEnvStore, 'env'>) => void,
    partial: Partial<AppEnv>,
): void {
    const next = mergeAppEnv({ ...get().env, ...partial });
    set({ env: next });
    if (get().loaded) saveAppEnv(next);
}

export const useAppEnvStore = create<AppEnvStore>((set, get) => ({
    env: { ...DEFAULT_APP_ENV },
    loaded: false,
    load: () => {
        if (get().loaded) return Promise.resolve();
        if (!loadPromise) {
            loadPromise = preloadAppEnv()
                .then((cached) => {
                    set({ env: cached, loaded: true });
                })
                .catch((error) => {
                    console.error('Failed to load app env:', error);
                    set({ env: { ...DEFAULT_APP_ENV }, loaded: true });
                })
                .finally(() => {
                    loadPromise = null;
                });
        }
        return loadPromise;
    },
    updateEnv: (key, value) => updateAndPersist(get, set, { [key]: value }),
    patchEnv: (partial) => updateAndPersist(get, set, partial),
}));
