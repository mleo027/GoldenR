import { useContext } from 'react';
import { ApiDebugEnvContext } from './ApiDebugEnvContext';

export function useApiDebugEnv() {
    const ctx = useContext(ApiDebugEnvContext);
    if (!ctx) {
        throw new Error('useApiDebugEnv must be used within ApiDebugEnvProvider');
    }
    return ctx;
}
