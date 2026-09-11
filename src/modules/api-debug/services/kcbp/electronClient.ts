import { apiCallRuntime } from '../../../../runtime/apiCallFacade';

export function canInvokeKcbp(): boolean {
    return apiCallRuntime.isAvailable();
}

export function cancelKcbpCall(): void {
    if (apiCallRuntime.isAvailable()) {
        void apiCallRuntime.cancel().catch(console.error);
    }
}
