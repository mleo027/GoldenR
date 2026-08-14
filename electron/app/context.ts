import { app } from 'electron';
import fsSync from 'fs';
import path from 'path';
import { KcbpClient } from '../kcbp';

export interface ElectronAppContext {
    kcbpClient: KcbpClient;
    getAppRootDir: () => string;
    getLegacyDataDir: () => string;
    getApiServerUserDataDir: () => string;
}

export function createAppContext(): ElectronAppContext {
    const kcbpClient = new KcbpClient();

    const getAppRootDir = (): string => {
        if (app.isPackaged) {
            const portableExecutableDir = process.env.PORTABLE_EXECUTABLE_DIR?.trim();
            if (portableExecutableDir) {
                return portableExecutableDir;
            }
            return path.dirname(app.getPath('exe'));
        }
        return process.cwd();
    };

    const getLegacyDataDir = (): string => {
        const dataDir = path.join(app.getPath('userData'), 'data');
        if (!fsSync.existsSync(dataDir)) {
            fsSync.mkdirSync(dataDir, { recursive: true });
        }
        return dataDir;
    };

    return {
        kcbpClient,
        getAppRootDir,
        getLegacyDataDir,
        getApiServerUserDataDir: getLegacyDataDir,
    };
}
