import { getElectronAPI } from '../../../../lib/electron';

export function canInvokeKcbp(): boolean {
    return Boolean(getElectronAPI()?.kcbp.call);
}

export function cancelKcbpCall(): void {
    const cancel = getElectronAPI()?.kcbp.cancel;
    if (cancel) {
        void cancel().catch(console.error);
    }
}
