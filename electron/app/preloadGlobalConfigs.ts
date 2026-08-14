import type { ElectronAppContext } from '../ipc/types';
import {
    loadKcbpRuntimeConfig,
    setKcbpRuntimeConfigUserDataDir,
} from '../services/kcbp/kcbpRuntimeConfigStore';

export async function preloadGlobalConfigs(ctx: ElectronAppContext): Promise<void> {
    const userDataDir = ctx.getApiServerUserDataDir();
    setKcbpRuntimeConfigUserDataDir(userDataDir);
    await loadKcbpRuntimeConfig();
}
