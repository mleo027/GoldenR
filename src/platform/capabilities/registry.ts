/**
 * 平台能力注册表。
 *
 * 职责边界（重要）：本目录是**平台共有设施**，只认识
 * `src/shared/capabilities/types` 的契约，**不认识任何模块**。模块由组合根
 * （`platform/registry/app-modules.tsx`）注入，因此新增模块永远不需要改平台。
 *
 * 这一条由 `registry.boundaries.test.ts` 强制：本目录不得 import `@/modules/**`。
 */
import type {
    CapabilityArgs,
    CapabilityContribution,
    CapabilityDescriptor,
    CapabilityHandlerMap,
} from '@/shared/capabilities/types';

/** 命名空间须为小写字母数字，且以字母开头；避免与工具名分隔符混淆。 */
const NAMESPACE_PATTERN = /^[a-z][a-z0-9]*$/;

interface RegisteredCapability {
    descriptor: CapabilityDescriptor;
    moduleId: string;
}

export interface CapabilityRegistry {
    /** 注册一个模块的能力包；命名空间/前缀/重名不合法时立即抛出。 */
    register(moduleId: string, contribution: CapabilityContribution): void;
    /** 已注册能力的描述，按名称排序（供 `tools/list` 等使用，不需要加载实现）。 */
    list(): CapabilityDescriptor[];
    has(name: string): boolean;
    /**
     * 载入全部实现并与描述比对；描述与实现的键集合不一致时抛出。
     * 用于启动自检与测试，避免"声明了没实现"悄悄通过。
     */
    validate(): Promise<void>;
    /** 调用能力；未知能力或未实现时抛出（由传输层决定如何呈现失败）。 */
    invoke(name: string, args: CapabilityArgs, context: unknown): Promise<unknown>;
    /** 仅供测试：清空全部注册状态。 */
    clear(): void;
}

export function createCapabilityRegistry(): CapabilityRegistry {
    const byName = new Map<string, RegisteredCapability>();
    const contributions = new Map<string, CapabilityContribution>();
    const handlersByModule = new Map<string, Promise<CapabilityHandlerMap>>();

    function assertDescriptorName(
        moduleId: string,
        namespace: string,
        descriptor: CapabilityDescriptor,
    ): void {
        const prefix = `${namespace}_`;
        if (!descriptor.name.startsWith(prefix) || descriptor.name.length === prefix.length) {
            throw new Error(
                `能力 ${descriptor.name} 未使用模块 ${moduleId} 的命名空间前缀 ${prefix}`,
            );
        }
        const owner = byName.get(descriptor.name);
        if (owner) {
            throw new Error(`能力名重复：${descriptor.name}（已由 ${owner.moduleId} 注册）`);
        }
    }

    function register(moduleId: string, contribution: CapabilityContribution): void {
        const { namespace, descriptors } = contribution;
        if (contributions.has(moduleId)) {
            throw new Error(`模块重复注册能力：${moduleId}`);
        }
        if (!NAMESPACE_PATTERN.test(namespace)) {
            throw new Error(`命名空间不合法：${namespace}（需匹配 ${NAMESPACE_PATTERN.source}）`);
        }
        if (descriptors.length === 0) {
            throw new Error(`模块 ${moduleId} 未声明任何能力`);
        }
        for (const descriptor of descriptors) {
            assertDescriptorName(moduleId, namespace, descriptor);
        }
        for (const descriptor of descriptors) {
            byName.set(descriptor.name, { descriptor, moduleId });
        }
        contributions.set(moduleId, contribution);
    }

    function handlersFor(moduleId: string): Promise<CapabilityHandlerMap> {
        const cached = handlersByModule.get(moduleId);
        if (cached) return cached;
        const contribution = contributions.get(moduleId);
        if (!contribution) throw new Error(`模块未注册能力：${moduleId}`);
        const pending = contribution.loadHandlers().catch((error: unknown) => {
            // 载入失败不缓存，允许后续重试。
            handlersByModule.delete(moduleId);
            throw error;
        });
        handlersByModule.set(moduleId, pending);
        return pending;
    }

    function list(): CapabilityDescriptor[] {
        return [...byName.values()]
            .map((entry) => entry.descriptor)
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    async function validate(): Promise<void> {
        for (const [moduleId, contribution] of contributions) {
            const handlers = await handlersFor(moduleId);
            const declared = new Set(contribution.descriptors.map((item) => item.name));
            const implemented = new Set(Object.keys(handlers));
            const missing = [...declared].filter((name) => !implemented.has(name));
            const extra = [...implemented].filter((name) => !declared.has(name));
            if (missing.length > 0 || extra.length > 0) {
                throw new Error(
                    `模块 ${moduleId} 的能力描述与实现不一致：缺少实现 [${missing.join(', ')}]，缺少描述 [${extra.join(', ')}]`,
                );
            }
        }
    }

    async function invoke(name: string, args: CapabilityArgs, context: unknown): Promise<unknown> {
        const entry = byName.get(name);
        if (!entry) throw new Error(`未知能力：${name}`);
        const handlers = await handlersFor(entry.moduleId);
        const handler = handlers[name];
        if (!handler) throw new Error(`能力未实现：${name}`);
        return handler(args, context);
    }

    function clear(): void {
        byName.clear();
        contributions.clear();
        handlersByModule.clear();
    }

    return { register, list, has: (name) => byName.has(name), validate, invoke, clear };
}

/** 应用级单例；组合根向它注册各模块的能力。 */
export const capabilityRegistry = createCapabilityRegistry();
