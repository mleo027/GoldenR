import { getElectronAPI, requireElectronAPI } from '@/lib/electron';
import type { ConfigStorageFileName } from '@/shared/config/files';

export interface ConfigRuntime {
    isAvailable(): boolean;
    read(name: ConfigStorageFileName): Promise<unknown | null>;
    write(name: ConfigStorageFileName, data: unknown): Promise<void>;
    flush(): Promise<void>;
}

export const configRuntime: ConfigRuntime = {
    isAvailable: () => Boolean(getElectronAPI()?.config),
    read: (name) => requireElectronAPI().config.read(name),
    write: (name, data) => requireElectronAPI().config.write(name, data),
    flush: () => requireElectronAPI().config.flush(),
};
