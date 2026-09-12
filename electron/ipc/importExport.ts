import {
    BrowserWindow,
    dialog,
    ipcMain,
    type OpenDialogOptions,
    type SaveDialogOptions,
} from 'electron';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { decodeIniBuffer } from '../readIniText';
import { invalidIpcArgument } from '../../src/shared/ipc/errors';
import { withIpcError } from './errors';

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

interface SaveFileOptions {
    /** invalidIpcArgument 错误信息中的格式名，如 'CSV export' */
    errorLabel: string;
    dialogTitle: string;
    /** 用户未填扩展名时的兑底默认文件名，如 'response.csv' */
    fallbackFilename: string;
    filterName: string;
    extension: string;
}

async function saveTextFileViaDialog(
    event: Electron.IpcMainInvokeEvent,
    payload: unknown,
    options: SaveFileOptions,
): Promise<{ saved: false } | { saved: true; filePath: string } | { saved: false; error: string }> {
    if (
        !payload ||
        typeof payload !== 'object' ||
        typeof (payload as { content?: unknown }).content !== 'string' ||
        typeof (payload as { defaultFilename?: unknown }).defaultFilename !== 'string'
    ) {
        throw invalidIpcArgument(`Invalid ${options.errorLabel} payload`);
    }
    const typedPayload = payload as { content: string; defaultFilename: string };
    const win = BrowserWindow.fromWebContents(event.sender);
    const ext = options.extension;
    const defaultFilename = typedPayload.defaultFilename.trim() || options.fallbackFilename;
    const defaultPath = defaultFilename.endsWith(`.${ext}`)
        ? defaultFilename
        : `${defaultFilename}.${ext}`;

    const result = await showSaveDialog(win, {
        title: options.dialogTitle,
        defaultPath,
        filters: [{ name: options.filterName, extensions: [ext] }],
    });

    if (result.canceled || !result.filePath) {
        return { saved: false as const };
    }

    try {
        await writeFile(result.filePath, typedPayload.content, 'utf-8');
        return { saved: true as const, filePath: result.filePath };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { saved: false as const, error: message };
    }
}

export function registerImportExportIpc(): void {
    ipcMain.handle(
        'export:saveJson',
        withIpcError((event, payload: unknown) =>
            saveTextFileViaDialog(event, payload, {
                errorLabel: 'JSON export',
                dialogTitle: '导出 JSON',
                fallbackFilename: 'param-suggest-rules.json',
                filterName: 'JSON',
                extension: 'json',
            }),
        ),
    );
    ipcMain.handle(
        'import:openFile',
        withIpcError(async (event, format: 'json' | 'ini') => {
            if (format !== 'json' && format !== 'ini') {
                throw invalidIpcArgument('Invalid import format');
            }
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
                try {
                    return {
                        opened: true as const,
                        format: 'json' as const,
                        data: JSON.parse(content),
                        filePath,
                    };
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    return { opened: false as const, error: `JSON 解析失败：${message}` };
                }
            }

            const iniBuffer = await readFile(filePath);
            const content = decodeIniBuffer(iniBuffer);
            return { opened: true as const, format: 'ini' as const, content, filePath };
        }),
    );

    ipcMain.handle(
        'param:openFile',
        withIpcError(async (event) => {
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
        }),
    );

    ipcMain.handle(
        'param:statFile',
        withIpcError(async (_event, filePath: string) => {
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
        }),
    );

    ipcMain.handle(
        'export:saveCsv',
        withIpcError((event, payload: unknown) =>
            saveTextFileViaDialog(event, payload, {
                errorLabel: 'CSV export',
                dialogTitle: '导出 CSV',
                fallbackFilename: 'response.csv',
                filterName: 'CSV',
                extension: 'csv',
            }),
        ),
    );

    ipcMain.handle(
        'export:saveTxt',
        withIpcError((event, payload: unknown) =>
            saveTextFileViaDialog(event, payload, {
                errorLabel: 'TXT export',
                dialogTitle: '导出纯文本',
                fallbackFilename: 'response.txt',
                filterName: 'TXT',
                extension: 'txt',
            }),
        ),
    );

    ipcMain.handle(
        'export:saveHtml',
        withIpcError((event, payload: unknown) =>
            saveTextFileViaDialog(event, payload, {
                errorLabel: 'HTML export',
                dialogTitle: '导出 HTML 报告',
                fallbackFilename: 'report.html',
                filterName: 'HTML',
                extension: 'html',
            }),
        ),
    );

    ipcMain.handle(
        'export:saveIni',
        withIpcError((event, payload: unknown) =>
            saveTextFileViaDialog(event, payload, {
                errorLabel: 'INI export',
                dialogTitle: '导出 INI',
                fallbackFilename: 'project.ini',
                filterName: 'INI',
                extension: 'ini',
            }),
        ),
    );
}
