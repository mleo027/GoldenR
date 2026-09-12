import { create } from 'zustand';
import type { ApiDebugEnv } from '../types';
import { DEFAULT_API_DEBUG_ENV } from '@/config/api-debug/defaults';
import { loadApiDebugEnv, mergeApiDebugEnv, saveApiDebugEnv } from './apiDebugEnvData';

export interface ApiDebugEnvStore {
    env: ApiDebugEnv;
    loaded: boolean;
    load: () => Promise<void>;
    updateEnv: <K extends keyof ApiDebugEnv>(key: K, value: ApiDebugEnv[K]) => void;
    patchEnv: (partial: Partial<ApiDebugEnv>) => void;
    reset: () => void;
}

let loadPromise: Promise<void> | null = null;

export const useApiDebugEnvStore = create<ApiDebugEnvStore>((set, get) => ({
    env: { ...DEFAULT_API_DEBUG_ENV },
    loaded: false,
    load: () => {
        if (get().loaded) return Promise.resolve();
        if (!loadPromise) {
            loadPromise = loadApiDebugEnv()
                .then((env) => set({ env, loaded: true }))
                .catch((error) => {
                    console.error('Failed to load API debug env:', error);
                    set({ env: { ...DEFAULT_API_DEBUG_ENV }, loaded: true });
                })
                .finally(() => {
                    loadPromise = null;
                });
        }
        return loadPromise;
    },
    updateEnv: (key, value) => {
        const env = mergeApiDebugEnv({ ...get().env, [key]: value });
        set({ env });
        if (get().loaded) saveApiDebugEnv(env);
    },
    patchEnv: (partial) => {
        const env = mergeApiDebugEnv({ ...get().env, ...partial });
        set({ env });
        if (get().loaded) saveApiDebugEnv(env);
    },
    reset: () => set({ env: { ...DEFAULT_API_DEBUG_ENV }, loaded: false }),
}));
