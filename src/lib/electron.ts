import type { ElectronAPI } from '../types/electron';

export function getElectronAPI(): ElectronAPI | undefined {
    if (typeof window === 'undefined') return undefined;
    return window.electronAPI;
}

export function requireElectronAPI(): ElectronAPI {
    const api = getElectronAPI();
    if (!api) {
        throw new Error('Electron API 不可用');
    }
    return api;
}
