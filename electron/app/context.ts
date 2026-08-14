import fsSync from 'fs';
import { KcbpClient } from '../kcbp';
import { getConfigDir } from '../config/configPaths';

export interface ElectronAppContext {
    kcbpClient: KcbpClient;
    getAppRootDir: () => string;
    getConfigDir: () => string;
    getLegacyDataDir: () => string;
    getApiServerUserDataDir: () => string;
}

export function createAppContext(): ElectronAppContext {
    const kcbpClient = new KcbpClient();
    const configDir = getConfigDir();
    fsSync.mkdirSync(configDir, { recursive: true });

    return {
        kcbpClient,
        getAppRootDir: () => configDir,
        getConfigDir: () => configDir,
        getLegacyDataDir: () => configDir,
        getApiServerUserDataDir: () => configDir,
    };
}
