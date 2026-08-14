import { APP_MODULES } from '../platform/registry/app-modules';
import { flushPendingAppEnvSave } from '../store/appEnvData';
import { getElectronAPI } from './electron';

export function flushAllPersistedState(): void {
    flushPendingAppEnvSave();
    for (const module of APP_MODULES) {
        module.flushPersistedState?.();
    }
}

export function setupPersistFlushListener(): void {
    const api = getElectronAPI();
    if (!api?.app.onFlushStorage) return;

    api.app.onFlushStorage(() => {
        flushAllPersistedState();
    });
}
