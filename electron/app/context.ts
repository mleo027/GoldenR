import fsSync from 'fs';
import { KcbpClient } from '../kcbp';
import { getConfigDir } from '../config/configPaths';
import { ConfigRepository } from '../database/repositories/configRepository';
import { initializeDatabase } from '../database/initializeDatabase';

export interface ElectronAppContext {
    kcbpClient: KcbpClient;
    getAppRootDir: () => string;
    getConfigDir: () => string;
    getLegacyDataDir: () => string;
    getApiServerUserDataDir: () => string;
    configRepository: ConfigRepository;
}

export function createAppContext(): ElectronAppContext {
    const kcbpClient = new KcbpClient();
    const configDir = getConfigDir();
    fsSync.mkdirSync(configDir, { recursive: true });
    const configRepository = new ConfigRepository(initializeDatabase(configDir));

    return {
        kcbpClient,
        getAppRootDir: () => configDir,
        getConfigDir: () => configDir,
        getLegacyDataDir: () => configDir,
        getApiServerUserDataDir: () => configDir,
        configRepository,
    };
}
