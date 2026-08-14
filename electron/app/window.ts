import { BrowserWindow } from 'electron';
import { getBuildIconPath, getPreloadScriptPath } from '../paths';

export function createMainWindow(): BrowserWindow {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 1024,
        minHeight: 560,
        frame: false,
        icon: getBuildIconPath(),
        webPreferences: {
            preload: getPreloadScriptPath(),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    win.setMenuBarVisibility(false);

    const sendMaximizedState = () => {
        win.webContents.send('window:maximized-changed', win.isMaximized());
    };

    win.on('maximize', sendMaximizedState);
    win.on('unmaximize', sendMaximizedState);

    if (process.env.VITE_DEV_SERVER_URL) {
        void win.loadURL(process.env.VITE_DEV_SERVER_URL).catch(console.error);
    } else {
        void win.loadFile('dist/index.html').catch(console.error);
    }

    return win;
}
