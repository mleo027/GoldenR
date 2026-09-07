import type { ElectronAppContext } from '../ipc/types';
import {
    loadKcbpRuntimeConfig,
    setKcbpRuntimeConfigRepository,
} from '../services/kcbp/kcbpRuntimeConfigStore';

export async function preloadGlobalConfigs(ctx: ElectronAppContext): Promise<void> {
    setKcbpRuntimeConfigRepository(ctx.configRepository);
    await loadKcbpRuntimeConfig();
}
