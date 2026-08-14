import { app, BrowserWindow } from 'electron';
import path from 'path';
import { createAppContext } from './context';
import { seedPortableConfigs } from './configSeed';
import { registerAppLifecycle } from './lifecycle';
import { createMainWindow } from './window';
import { registerAllIpcHandlers } from '../ipc/register';
import { reloadSuggestConfig, setSuggestAppRootDir } from '../suggestRuleEngine';
import { preloadGlobalConfigs } from './preloadGlobalConfigs';

export async function bootstrapElectronApp(): Promise<void> {
    const ctx = createAppContext();

    if (app.isPackaged) {
        await seedPortableConfigs(path.dirname(app.getPath('exe')), ctx.getAppRootDir());
    }

    setSuggestAppRootDir(ctx.getAppRootDir());
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
