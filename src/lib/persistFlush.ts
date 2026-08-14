import { APP_MODULES } from '../platform/registry/app-modules';
import { flushPendingAppEnvSaveAsync } from '../store/appEnvData';
import { getElectronAPI } from './electron';

export async function flushAllPersistedState(): Promise<void> {
    await flushPendingAppEnvSaveAsync();
    const results = await Promise.allSettled(
        APP_MODULES.map(async (module) => {
            await module.flushPersistedState?.();
        }),
    );
    const errors = results
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map((result) => result.reason);
    if (errors.length > 0) {
        throw new Error(`Persisted state flush failed: ${errors.map(String).join('; ')}`);
    }
}

export function setupPersistFlushListener(): void {
    const api = getElectronAPI();
    if (!api?.app.onFlushStorage) return;

    api.app.onFlushStorage(async () => {
        await flushAllPersistedState();
    });
}
