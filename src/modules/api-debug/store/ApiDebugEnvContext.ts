import { createContext } from 'react';
import type { ApiDebugEnv } from '../types';

export interface ApiDebugEnvContextValue {
    env: ApiDebugEnv;
    loaded: boolean;
    updateEnv: <K extends keyof ApiDebugEnv>(key: K, value: ApiDebugEnv[K]) => void;
    patchEnv: (partial: Partial<ApiDebugEnv>) => void;
}

export const ApiDebugEnvContext = createContext<ApiDebugEnvContextValue | null>(null);
