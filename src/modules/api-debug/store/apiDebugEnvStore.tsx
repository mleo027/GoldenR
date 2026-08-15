import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ApiDebugEnv } from '../types';
import { DEFAULT_API_DEBUG_ENV } from '@/config/api-debug/defaults';
import { ApiDebugEnvContext } from './ApiDebugEnvContext';
import { loadApiDebugEnv, mergeApiDebugEnv, saveApiDebugEnv } from './apiDebugEnvData';

function isSameEnv(a: ApiDebugEnv, b: ApiDebugEnv): boolean {
    return (
        a.editorMode === b.editorMode &&
        a.activeKcxpEnvironmentId === b.activeKcxpEnvironmentId &&
        a.kcxpEnvironments.length === b.kcxpEnvironments.length &&
        a.kcxpEnvironments.every((item, index) => {
            const other = b.kcxpEnvironments[index];
            return (
                item.id === other.id &&
                item.name === other.name &&
                item.host === other.host &&
                item.queue === other.queue &&
                item.timeout === other.timeout
            );
        })
    );
}

export function ApiDebugEnvProvider({ children }: { children: ReactNode }) {
    const [env, setEnv] = useState<ApiDebugEnv>({ ...DEFAULT_API_DEBUG_ENV });
    const [loaded, setLoaded] = useState(false);
    const persistedEnvRef = useRef<ApiDebugEnv | null>(null);

    useEffect(() => {
        void loadApiDebugEnv()
            .then((cached) => {
                persistedEnvRef.current = cached;
                setEnv(cached);
                setLoaded(true);
            })
            .catch((error) => {
                console.error('Failed to load API debug env:', error);
                persistedEnvRef.current = { ...DEFAULT_API_DEBUG_ENV };
                setLoaded(true);
            });
    }, []);

    useEffect(() => {
        if (!loaded || !persistedEnvRef.current) return;
        if (isSameEnv(env, persistedEnvRef.current)) return;
        persistedEnvRef.current = env;
        saveApiDebugEnv(env);
    }, [env, loaded]);

    const updateEnv = useCallback(<K extends keyof ApiDebugEnv>(key: K, value: ApiDebugEnv[K]) => {
        setEnv((prev) => mergeApiDebugEnv({ ...prev, [key]: value }));
    }, []);

    const patchEnv = useCallback((partial: Partial<ApiDebugEnv>) => {
        setEnv((prev) => mergeApiDebugEnv({ ...prev, ...partial }));
    }, []);

    const value = useMemo(
        () => ({
            env,
            loaded,
            updateEnv,
            patchEnv,
        }),
        [env, loaded, updateEnv, patchEnv],
    );

    return <ApiDebugEnvContext.Provider value={value}>{children}</ApiDebugEnvContext.Provider>;
}
