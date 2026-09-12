/**
 * 把 API 调试模块的能力注册进平台注册表。
 *
 * 与接口自动化模块同样的两段式：**描述**（`./manifest`）静态可得，组合根启动时即注册；
 * **实现与上下文**（`./handlers`、`./context`）走动态 import，首次调用时才载入——
 * 静态引入会把 api-debug 的 store 与运行器拉进启动包，模块懒加载就失效了。
 */
import type { CapabilityRegistry } from '@/platform/capabilities/registry';
import { capabilityRegistry } from '@/platform/capabilities/registry';
import {
    API_DEBUG_CAPABILITY_NAMESPACE,
    API_DEBUG_CAPABILITY_OWNER,
    apiDebugCapabilityDescriptors,
} from './manifest';

const registeredRegistries = new WeakSet<CapabilityRegistry>();

export function registerApiDebugCapabilities(
    registry: CapabilityRegistry = capabilityRegistry,
): void {
    if (registeredRegistries.has(registry)) return;
    registeredRegistries.add(registry);
    registry.register(API_DEBUG_CAPABILITY_OWNER, {
        namespace: API_DEBUG_CAPABILITY_NAMESPACE,
        descriptors: apiDebugCapabilityDescriptors,
        loadHandlers: () => import('./handlers').then((module) => module.handlers),
        createContext: () =>
            import('./context').then((module) => module.createApiDebugCapabilityContext()),
    });
}

export {
    API_DEBUG_CAPABILITY_NAMESPACE,
    API_DEBUG_CAPABILITY_OWNER,
    apiDebugCapabilityDescriptors,
};
