import { requireElectronAPI } from '@/lib/electron';
import type {
    CapabilityInvokeRequest,
    CapabilityInvokeResponse,
    CapabilityManifestPayload,
} from '@/shared/capabilities/host';

/**
 * 能力宿主的渲染进程门面。
 *
 * 与其它 runtime facade 一致：渲染层只能经这里访问 Electron 桥，
 * 不直接引用全局桥对象。
 */
export const capabilityHostBridge = {
    onInvoke: (callback: (request: CapabilityInvokeRequest) => void): (() => void) =>
        requireElectronAPI().capabilities.onInvoke(callback),
    respond: (response: CapabilityInvokeResponse): Promise<void> =>
        requireElectronAPI().capabilities.respond(response),
    publishManifest: (payload: CapabilityManifestPayload): Promise<void> =>
        requireElectronAPI().capabilities.publishManifest(payload),
};
