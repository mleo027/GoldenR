/**
 * 把接口自动化模块的能力注册进平台注册表。
 *
 * 拆成两段是刻意的：
 * - **描述**（`./manifest`）静态可得，组合根启动时就会注册，因此模块从未被打开过
 *   也能拿到完整的 `tools/list`；
 * - **实现**（`./handlers`）走动态 import，第一次被调用时才载入。
 *
 * 注册是幂等的：组合根与模块内调用点都会触发，重复调用无副作用。
 */
import type { CapabilityRegistry } from '@/platform/capabilities/registry';
import { capabilityRegistry } from '@/platform/capabilities/registry';
import {
    AUTOMATION_CAPABILITY_NAMESPACE,
    AUTOMATION_CAPABILITY_OWNER,
    automationCapabilityDescriptors,
} from './manifest';

const registeredRegistries = new WeakSet<CapabilityRegistry>();

export function registerAutomationCapabilities(
    registry: CapabilityRegistry = capabilityRegistry,
): void {
    if (registeredRegistries.has(registry)) return;
    registeredRegistries.add(registry);
    registry.register(AUTOMATION_CAPABILITY_OWNER, {
        namespace: AUTOMATION_CAPABILITY_NAMESPACE,
        descriptors: automationCapabilityDescriptors,
        loadHandlers: () => import('./handlers').then((module) => module.handlers),
    });
}

export {
    AUTOMATION_CAPABILITY_NAMESPACE,
    AUTOMATION_CAPABILITY_OWNER,
    automationCapabilityDescriptors,
};
