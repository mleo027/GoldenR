import type { ElectronAPI } from '../types/electron';

export function getElectronAPI(): ElectronAPI | undefined {
    return window.electronAPI;
}

export function requireElectronAPI(): ElectronAPI {
    if (!window.electronAPI) {
        throw new Error('Electron API 不可用');
    }
    return window.electronAPI;
}
