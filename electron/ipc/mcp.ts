import { ipcMain } from 'electron';
import { invalidIpcArgument } from '../../src/shared/ipc/errors';
import type { ElectronAppContext } from '../app/context';
import { readMcpState, saveMcpSettings } from '../mcp';
import { withIpcError } from './errors';

/** MCP 开关与审计的 IPC。开关切换会即时生效（启动/停止服务器）。 */
export function registerMcpIpc(ctx: ElectronAppContext): void {
    ipcMain.handle(
        'mcp:readState',
        withIpcError(() => readMcpState(ctx)),
    );
    ipcMain.handle(
        'mcp:writeSettings',
        withIpcError((_event, value: unknown) => {
            if (!value || typeof value !== 'object') {
                throw invalidIpcArgument('Invalid MCP settings');
            }
            return saveMcpSettings(ctx, value);
        }),
    );
}
