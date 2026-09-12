import fsSync from 'fs';
import { KcbpClient } from '../kcbp';
import { getConfigDir } from '../config/configPaths';
import { ConfigRepository } from '../database/repositories/configRepository';
import { AutomationRepository } from '../database/repositories/automationRepository';
import { initializeDatabase } from '../database/initializeDatabase';

export interface ElectronAppContext {
    kcbpClient: KcbpClient;
    getAppRootDir: () => string;
    getConfigDir: () => string;
    getLegacyDataDir: () => string;
    getApiServerUserDataDir: () => string;
    configRepository: ConfigRepository;
    automationRepository: AutomationRepository;
}

export function createAppContext(): ElectronAppContext {
    const kcbpClient = new KcbpClient();
    const configDir = getConfigDir();
    fsSync.mkdirSync(configDir, { recursive: true });
    const database = initializeDatabase(configDir);
    const configRepository = new ConfigRepository(database);
    const automationRepository = new AutomationRepository(database);

    return {
        kcbpClient,
        getAppRootDir: () => configDir,
        getConfigDir: () => configDir,
        getLegacyDataDir: () => configDir,
        getApiServerUserDataDir: () => configDir,
        configRepository,
        automationRepository,
    };
}
