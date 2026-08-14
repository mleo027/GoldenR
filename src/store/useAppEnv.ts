import { useContext } from 'react';
import { AppEnvContext } from './AppEnvContext';
import type { AppEnvContextValue } from './AppEnvContext';

export function useAppEnv(): AppEnvContextValue {
    const context = useContext(AppEnvContext);
    if (!context) {
        throw new Error('useAppEnv must be used within an AppEnvProvider');
    }
    return context;
}
