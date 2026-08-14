import { app, BrowserWindow } from 'electron';

export function registerAppLifecycle(): void {
    app.on('before-quit', (event) => {
        const windows = BrowserWindow.getAllWindows();
        if (windows.length === 0) return;

        event.preventDefault();
        for (const win of windows) {
            win.webContents.send('app:flush-storage');
        }

        setTimeout(() => {
            app.exit(0);
        }, 300);
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });
}
