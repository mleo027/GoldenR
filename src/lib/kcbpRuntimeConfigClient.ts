import { requireElectronAPI } from '@/lib/electron';
import type { KcbpRuntimeConfig } from '@/shared/kcbp/types';

let cachedConfig: KcbpRuntimeConfig | null = null;
let loadPromise: Promise<KcbpRuntimeConfig> | null = null;

/** 应用启动时尽早调用，与主进程预加载并行拉取 KCBP 全局配置 */
export function preloadKcbpRuntimeConfig(): Promise<KcbpRuntimeConfig> {
    if (cachedConfig) {
        return Promise.resolve(cachedConfig);
    }
    if (!loadPromise) {
        loadPromise = requireElectronAPI()
            .kcbpRuntime.getConfig()
            .then((config) => {
                cachedConfig = config;
                return config;
            });
    }
    return loadPromise;
}

export function getKcbpRuntimeConfig(): Promise<KcbpRuntimeConfig> {
    return preloadKcbpRuntimeConfig();
}

export function saveKcbpRuntimeConfig(config: KcbpRuntimeConfig): Promise<KcbpRuntimeConfig> {
    return requireElectronAPI()
        .kcbpRuntime.saveConfig(config)
        .then((saved) => {
            cachedConfig = saved;
            return saved;
        });
}

export function pickKcbpRuntimeDirectory(defaultPath?: string) {
    return requireElectronAPI().kcbpRuntime.pickDirectory(defaultPath);
}

export function pickKcbpRuntimeFile(defaultPath?: string) {
    return requireElectronAPI().kcbpRuntime.pickFile(defaultPath);
}
