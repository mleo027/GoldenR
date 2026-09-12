import { app, BrowserWindow } from 'electron';
import { createAppContext } from './context';
import { registerAppLifecycle } from './lifecycle';
import { createMainWindow } from './window';
import { registerAllIpcHandlers } from '../ipc/register';
import { registerMcpHost } from '../mcp';
import { reloadSuggestConfig, setSuggestRepository } from '../suggestRuleEngine';
import { preloadGlobalConfigs } from './preloadGlobalConfigs';

export async function bootstrapElectronApp(): Promise<void> {
    const ctx = createAppContext();
    setSuggestRepository(ctx.configRepository);
    await reloadSuggestConfig();
    await preloadGlobalConfigs(ctx);

    registerAllIpcHandlers(ctx);
    // 能力通道必须先就绪：MCP 的 tools/call 要靠它把执行转给渲染层。
    registerMcpHost({ getConfigDir: ctx.getConfigDir });
    registerAppLifecycle();
    createMainWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
}
