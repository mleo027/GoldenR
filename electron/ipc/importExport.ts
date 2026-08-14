import {
    BrowserWindow,
    dialog,
    ipcMain,
    type OpenDialogOptions,
    type SaveDialogOptions,
} from 'electron';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { decodeIniBuffer } from '../readIniText';

async function showOpenDialog(
    win: BrowserWindow | null | undefined,
    options: OpenDialogOptions,
): Promise<Electron.OpenDialogReturnValue> {
    return win ? dialog.showOpenDialog(win, options) : dialog.showOpenDialog(options);
}

async function showSaveDialog(
    win: BrowserWindow | null | undefined,
    options: SaveDialogOptions,
): Promise<Electron.SaveDialogReturnValue> {
    return win ? dialog.showSaveDialog(win, options) : dialog.showSaveDialog(options);
}

export function registerImportExportIpc(): void {
    ipcMain.handle('import:openFile', async (event, format: 'json' | 'ini') => {
        const win = BrowserWindow.fromWebContents(event.sender);
        const isJson = format === 'json';
        const result = await showOpenDialog(win, {
            title: isJson ? '导入接口 JSON' : '导入接口 INI',
            filters: isJson
                ? [{ name: 'JSON', extensions: ['json'] }]
                : [{ name: 'INI', extensions: ['ini'] }],
            properties: ['openFile'],
        });

        if (result.canceled || !result.filePaths[0]) {
            return { opened: false as const };
        }

        const filePath = result.filePaths[0];

        if (isJson) {
            const content = await readFile(filePath, 'utf-8');
            return {
                opened: true as const,
                format: 'json' as const,
                data: JSON.parse(content),
                filePath,
            };
        }

        const iniBuffer = await readFile(filePath);
        const content = decodeIniBuffer(iniBuffer);
        return { opened: true as const, format: 'ini' as const, content, filePath };
    });

    ipcMain.handle('param:openFile', async (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        const result = await showOpenDialog(win, {
            title: '选择入参文件',
            properties: ['openFile'],
        });

        if (result.canceled || !result.filePaths[0]) {
            return { opened: false as const };
        }

        const filePath = result.filePaths[0];
        const fileStat = await stat(filePath);
        return { opened: true as const, filePath, size: fileStat.size };
    });

    ipcMain.handle('param:statFile', async (_event, filePath: string) => {
        const trimmed = typeof filePath === 'string' ? filePath.trim() : '';
        if (!trimmed) {
            return { exists: false as const, error: '路径为空' };
        }

        try {
            const fileStat = await stat(trimmed);
            if (!fileStat.isFile()) {
                return { exists: false as const, error: '不是文件' };
            }
            return { exists: true as const, size: fileStat.size };
        } catch (error) {
            const nodeError = error as NodeJS.ErrnoException;
            if (nodeError.code === 'ENOENT') {
                return { exists: false as const, error: '文件不存在' };
            }
            const message = error instanceof Error ? error.message : String(error);
            return { exists: false as const, error: message };
        }
    });

    ipcMain.handle(
        'export:saveCsv',
        async (event, payload: { content: string; defaultFilename: string }) => {
            const win = BrowserWindow.fromWebContents(event.sender);
            const defaultFilename = payload.defaultFilename.trim() || 'response.csv';
            const defaultPath = defaultFilename.endsWith('.csv')
                ? defaultFilename
                : `${defaultFilename}.csv`;

            const result = await showSaveDialog(win, {
                title: '导出 CSV',
                defaultPath,
                filters: [{ name: 'CSV', extensions: ['csv'] }],
            });

            if (result.canceled || !result.filePath) {
                return { saved: false as const };
            }

            try {
                await writeFile(result.filePath, payload.content, 'utf-8');
                return { saved: true as const, filePath: result.filePath };
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                return { saved: false as const, error: message };
            }
        },
    );

    ipcMain.handle(
        'export:saveHtml',
        async (event, payload: { content: string; defaultFilename: string }) => {
            const win = BrowserWindow.fromWebContents(event.sender);
            const defaultFilename = payload.defaultFilename.trim() || 'report.html';
            const defaultPath = defaultFilename.endsWith('.html')
                ? defaultFilename
                : `${defaultFilename}.html`;

            const result = await showSaveDialog(win, {
                title: '导出 HTML 报告',
                defaultPath,
                filters: [{ name: 'HTML', extensions: ['html'] }],
            });

            if (result.canceled || !result.filePath) {
                return { saved: false as const };
            }

            try {
                await writeFile(result.filePath, payload.content, 'utf-8');
                return { saved: true as const, filePath: result.filePath };
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                return { saved: false as const, error: message };
            }
        },
    );
}
