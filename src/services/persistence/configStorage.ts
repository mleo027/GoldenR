import { getElectronAPI } from '@/lib/electron';
import type { ConfigStorageFileName } from '@/shared/config/files';

export interface ConfigStoragePort {
    read(name: ConfigStorageFileName, fromUserData?: boolean): Promise<unknown | null>;
    write(name: ConfigStorageFileName, data: unknown): Promise<void>;
}

export function createElectronConfigStoragePort(): ConfigStoragePort {
    return {
        async read(name, fromUserData) {
            const api = getElectronAPI();
            if (!api) return null;
            try {
                return await api.config.read(name, fromUserData);
            } catch {
                return null;
            }
        },
        async write(name, data) {
            const api = getElectronAPI();
            if (!api) return;
            await api.config.write(name, data);
        },
    };
}

export const configStorage: ConfigStoragePort = createElectronConfigStoragePort();
