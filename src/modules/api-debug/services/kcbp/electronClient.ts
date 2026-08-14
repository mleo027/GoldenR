import { getElectronAPI } from '../../../../lib/electron';

export function canInvokeKcbp(): boolean {
    return Boolean(getElectronAPI()?.kcbp.call);
}

export function cancelKcbpCall(): void {
    void getElectronAPI()?.kcbp.cancel?.();
}
