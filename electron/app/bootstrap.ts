import { app, BrowserWindow } from 'electron';
import { createAppContext } from './context';
import { registerAppLifecycle } from './lifecycle';
import { createMainWindow } from './window';
import { registerAllIpcHandlers } from '../ipc/register';
import { reloadSuggestConfig, setSuggestRepository } from '../suggestRuleEngine';
import { preloadGlobalConfigs } from './preloadGlobalConfigs';

export async function bootstrapElectronApp(): Promise<void> {
    const ctx = createAppContext();
    setSuggestRepository(ctx.configRepository);
    await reloadSuggestConfig();
    await preloadGlobalConfigs(ctx);

    registerAllIpcHandlers(ctx);
    registerAppLifecycle();
    createMainWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
}
