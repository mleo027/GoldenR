import { APP_MODULES } from '../platform/registry/app-modules';
import { flushPendingAppEnvSaveAsync } from '../store/appEnvData';
import { getElectronAPI } from './electron';

export async function flushAllPersistedState(): Promise<void> {
    await flushPendingAppEnvSaveAsync();
    for (const module of APP_MODULES) {
        await module.flushPersistedState?.();
    }
}

export function setupPersistFlushListener(): void {
    const api = getElectronAPI();
    if (!api?.app.onFlushStorage) return;

    api.app.onFlushStorage(async () => {
        await flushAllPersistedState();
    });
}
