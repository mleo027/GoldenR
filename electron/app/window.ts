import { app, BrowserWindow } from 'electron';
import { isWindowCloseAllowed } from './closeGuard';
import { getBuildIconPath, getPreloadScriptPath } from '../paths';
import { isTrustedDocumentUrl } from '../ipc/security';

export function createMainWindow(): BrowserWindow {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 1200,
        minHeight: 560,
        frame: false,
        title: 'Golden API',
        icon: getBuildIconPath(),
        webPreferences: {
            preload: getPreloadScriptPath(),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    win.setMenuBarVisibility(false);

    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('will-navigate', (event, url) => {
        if (!isTrustedDocumentUrl(url)) event.preventDefault();
    });

    win.on('close', (event) => {
        if (process.platform === 'darwin' || isWindowCloseAllowed()) return;
        event.preventDefault();
        app.quit();
    });

    const sendMaximizedState = () => {
        win.webContents.send('window:maximized-changed', win.isMaximized());
    };

    win.on('maximize', sendMaximizedState);
    win.on('unmaximize', sendMaximizedState);

    if (process.env.VITE_DEV_SERVER_URL) {
        void win.loadURL(process.env.VITE_DEV_SERVER_URL).catch(console.error);
        win.webContents.openDevTools({ mode: 'detach' });
    } else {
        void win.loadFile('dist/index.html').catch(console.error);
    }

    return win;
}
