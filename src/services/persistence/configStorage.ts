import { getElectronAPI } from '@/lib/electron';
import type { ConfigStorageFileName } from '@/shared/config/files';

export interface ConfigStoragePort {
    read(name: ConfigStorageFileName): Promise<unknown | null>;
    write(name: ConfigStorageFileName, data: unknown): Promise<void>;
}

export function createElectronConfigStoragePort(): ConfigStoragePort {
    return {
        async read(name) {
            const api = getElectronAPI();
            if (!api) return null;
            return api.config.read(name);
        },
        async write(name, data) {
            const api = getElectronAPI();
            if (!api) return;
            await api.config.write(name, data);
        },
    };
}

export const configStorage: ConfigStoragePort = createElectronConfigStoragePort();
