import { BrowserWindow, ipcMain } from 'electron';

export function registerWindowIpc(): void {
    ipcMain.handle('window:minimize', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        win?.minimize();
    });

    ipcMain.handle('window:toggleMaximize', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (!win) return false;

        if (win.isMaximized()) {
            win.unmaximize();
        } else {
            win.maximize();
        }

        return win.isMaximized();
    });

    ipcMain.handle('window:isMaximized', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        return win?.isMaximized() ?? false;
    });
}
