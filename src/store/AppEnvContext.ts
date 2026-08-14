import { createContext } from 'react';
import type { AppEnv } from '../types';

export interface AppEnvContextValue {
    env: AppEnv;
    loaded: boolean;
    updateEnv: <K extends keyof AppEnv>(key: K, value: AppEnv[K]) => void;
    patchEnv: (partial: Partial<AppEnv>) => void;
}

export const AppEnvContext = createContext<AppEnvContextValue | null>(null);
