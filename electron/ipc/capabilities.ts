import { app, BrowserWindow, ipcMain } from 'electron';
import type {
    CapabilityInvokeRequest,
    CapabilityInvokeResponse,
} from '../../src/shared/capabilities/host';
import { invalidIpcArgument } from '../../src/shared/ipc/errors';
import { configureCapabilityChannel } from '../services/capabilities/capabilityChannel';
import { withIpcError } from './errors';

/**
 * 本应用只有一个主窗口，广播即可。没有窗口时直接拒绝——让调用方立刻拿到明确错误，
 * 而不是等满超时（能力执行必须有渲染层参与）。
 */
function broadcast(request: CapabilityInvokeRequest): void {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length === 0) throw new Error('应用没有可用窗口，无法执行能力调用');
    for (const window of windows) {
        window.webContents.send('capabilities:invoke', request);
    }
}

function isResponse(value: unknown): value is CapabilityInvokeResponse {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Partial<CapabilityInvokeResponse>;
    return typeof candidate.requestId === 'string' && typeof candidate.ok === 'boolean';
}

export function registerCapabilityIpc(): void {
    const invoker = configureCapabilityChannel(broadcast);

    ipcMain.handle(
        'capabilities:respond',
        withIpcError((_event, value: unknown) => {
            if (!isResponse(value)) throw invalidIpcArgument('Invalid capability response');
            invoker.settle(value);
        }),
    );

    // 渲染层重载或崩溃后，在途调用不会再被回填：立即失败，而不是干等超时。
    app.on('web-contents-created', (_event, contents) => {
        contents.on('render-process-gone', () => invoker.rejectAll('渲染进程已退出，能力调用中止'));
        contents.on('did-start-navigation', () =>
            invoker.rejectAll('渲染层正在重载，能力调用中止'),
        );
    });
}
