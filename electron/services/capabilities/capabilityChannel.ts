import type { CapabilityInvokeRequest } from '../../../src/shared/capabilities/host';
import { CapabilityInvoker } from './capabilityInvoker';

let invoker: CapabilityInvoker | undefined;

/**
 * 由 IPC 注册装配传输实现。在此之前调用能力会明确报错，而不是静默挂起。
 */
export function configureCapabilityChannel(
    send: (request: CapabilityInvokeRequest) => void,
): CapabilityInvoker {
    invoker = new CapabilityInvoker({ send });
    return invoker;
}

export function getCapabilityInvoker(): CapabilityInvoker {
    if (!invoker) throw new Error('能力通道尚未就绪');
    return invoker;
}

/**
 * 主进程发起一次能力调用（外部调用方与 MCP 服务器的入口）。
 *
 * 真正的执行在渲染层：那里才有场景运行器与权威状态。
 */
export async function invokeCapabilityInRenderer(
    name: string,
    args?: Record<string, unknown>,
): Promise<unknown> {
    return getCapabilityInvoker().invoke(name, args);
}
