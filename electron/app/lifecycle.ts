import { app, BrowserWindow, ipcMain } from 'electron';
import { FlushCoordinator } from './flushCoordinator';

const flushCoordinator = new FlushCoordinator({
    timeoutMs: 3000,
    onFinish: (reason, requestId) => {
        if (reason === 'timeout') {
            console.error(`App flush timed out for request ${requestId}`);
        }
        app.exit(0);
    },
});

export function registerAppLifecycle(): void {
    app.on('before-quit', (event) => {
        const windows = BrowserWindow.getAllWindows();
        if (windows.length === 0) return;

        event.preventDefault();
        const requestId = flushCoordinator.begin(windows.map((win) => win.id));
        if (!requestId) return;

        for (const win of windows) {
            win.webContents.send('app:flush-storage', requestId);
            win.once('closed', () => {
                flushCoordinator.handleWindowClosed(win.id);
            });
        }
    });

    ipcMain.on('app:flush-storage-complete', (event, requestId: string, errorMessage?: string) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (!win) return;
        if (errorMessage) {
            console.error(`App flush failed for request ${requestId}: ${errorMessage}`);
        }
        flushCoordinator.complete(win.id, requestId);
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });
}
