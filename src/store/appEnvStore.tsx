/** 全局 AppEnv：主题、布局偏好、activeModuleId；持久化至 app.json */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppEnv } from '../types';
import { DEFAULT_APP_ENV } from '../constants/appEnv';
import { AppEnvContext } from './AppEnvContext';
import { saveAppEnv, mergeAppEnv, preloadAppEnv } from './appEnvData';

function applyDocumentTheme(darkMode: boolean): void {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    document.documentElement.style.colorScheme = darkMode ? 'dark' : 'light';
}

function isSameEnv(a: AppEnv, b: AppEnv): boolean {
    return (
        a.compactMode === b.compactMode &&
        a.showRowIndex === b.showRowIndex &&
        a.autoSave === b.autoSave &&
        a.darkMode === b.darkMode &&
        a.activeModuleId === b.activeModuleId &&
        a.sidebarVisible === b.sidebarVisible
    );
}

export function AppEnvProvider({ children }: { children: ReactNode }) {
    const [env, setEnv] = useState<AppEnv>({ ...DEFAULT_APP_ENV });
    const [loaded, setLoaded] = useState(false);
    const persistedEnvRef = useRef<AppEnv | null>(null);

    useEffect(() => {
        void preloadAppEnv()
            .then((cached) => {
                persistedEnvRef.current = cached;
                applyDocumentTheme(cached.darkMode);
                setEnv(cached);
                setLoaded(true);
            })
            .catch(console.error);
    }, []);

    useEffect(() => {
        if (!loaded) return;
        applyDocumentTheme(env.darkMode);
    }, [env.darkMode, loaded]);

    useEffect(() => {
        if (!loaded || !persistedEnvRef.current) return;
        if (isSameEnv(env, persistedEnvRef.current)) return;
        persistedEnvRef.current = env;
        saveAppEnv(env);
    }, [env, loaded]);

    const updateEnv = useCallback(<K extends keyof AppEnv>(key: K, value: AppEnv[K]) => {
        setEnv((prev) => mergeAppEnv({ ...prev, [key]: value }));
    }, []);

    const patchEnv = useCallback((partial: Partial<AppEnv>) => {
        setEnv((prev) => mergeAppEnv({ ...prev, ...partial }));
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

    return <AppEnvContext.Provider value={value}>{children}</AppEnvContext.Provider>;
}
