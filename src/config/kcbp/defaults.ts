import type { KcbpRuntimeConfig } from '@/shared/kcbp/types';

export function createDefaultKcbpRuntimeConfig(): KcbpRuntimeConfig {
    return {
        executable: '',
        workingDir: '',
        args: [],
    };
}
