import { BrowserWindow, ipcMain } from 'electron';
import { withIpcError } from './errors';

export function registerWindowIpc(): void {
    ipcMain.handle(
        'window:minimize',
        withIpcError((event) => {
            const win = BrowserWindow.fromWebContents(event.sender);
            win?.minimize();
        }),
    );

    ipcMain.handle(
        'window:toggleMaximize',
        withIpcError((event) => {
            const win = BrowserWindow.fromWebContents(event.sender);
            if (!win) return false;

            if (win.isMaximized()) {
                win.unmaximize();
            } else {
                win.maximize();
            }

            return win.isMaximized();
        }),
    );

    ipcMain.handle(
        'window:isMaximized',
        withIpcError((event) => {
            const win = BrowserWindow.fromWebContents(event.sender);
            return win?.isMaximized() ?? false;
        }),
    );
}
