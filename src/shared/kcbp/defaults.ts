import type { KcbpRuntimeConfig } from './types';

export function createDefaultKcbpRuntimeConfig(): KcbpRuntimeConfig {
    return {
        executable: '',
        workingDir: '',
        args: [],
    };
}
