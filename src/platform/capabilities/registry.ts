/**
 * 平台能力注册表。
 *
 * 职责边界（重要）：本目录是**平台共有设施**，只认识
 * `src/shared/capabilities/types` 的契约，**不认识任何模块**。模块由组合根
 * （`platform/registry/app-modules.tsx`）注入，因此新增模块永远不需要改平台。
 *
 * 这一条由架构边界测试强制：本目录不得 import `@/modules/**`。
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

interface RegistryState {
    byName: Map<string, RegisteredCapability>;
    contributions: Map<string, CapabilityContribution>;
    handlersByModule: Map<string, Promise<CapabilityHandlerMap>>;
}

export interface CapabilityRegistry {
    /** 注册一个模块的能力包；命名空间/前缀/重名不合法时立即抛出。 */
    register(moduleId: string, contribution: CapabilityContribution): void;
    /** 已注册能力的描述，按名称排序（供 `tools/list` 等使用，不需要加载实现）。 */
    list(): CapabilityDescriptor[];
    has(name: string): boolean;
    /**
     * 载入全部实现并与描述比对；描述与实现的键集合不一致时抛出。
     * 用于启动自检与测试，避免“声明了没实现”悄悄通过。
     */
    validate(): Promise<void>;
    /** 调用能力；未知能力或未实现时抛出（由传输层决定如何呈现失败）。 */
    invoke(name: string, args: CapabilityArgs, context: unknown): Promise<unknown>;
    /**
     * 由平台组装上下文后调用，供外部调用方（MCP 等）使用：
     * 先向所属模块要上下文，再委托给 `invoke`。
     */
    dispatch(name: string, args: CapabilityArgs): Promise<unknown>;
    /** 能力归属（用于审计与错误信息）；未注册时返回 undefined。 */
    ownerOf(name: string): { moduleId: string; namespace: string } | undefined;
    /** 仅供测试：清空全部注册状态。 */
    clear(): void;
}

function assertDescriptorName(
    state: RegistryState,
    moduleId: string,
    namespace: string,
    descriptor: CapabilityDescriptor,
): void {
    const prefix = `${namespace}_`;
    if (!descriptor.name.startsWith(prefix) || descriptor.name.length === prefix.length) {
        throw new Error(`能力 ${descriptor.name} 未使用模块 ${moduleId} 的命名空间前缀 ${prefix}`);
    }
    const owner = state.byName.get(descriptor.name);
    if (owner) {
        throw new Error(`能力名重复：${descriptor.name}（已由 ${owner.moduleId} 注册）`);
    }
}

/** 注册前校验：重复注册、命名空间、空描述、缺少上下文工厂、前缀与重名。 */
function assertContribution(
    state: RegistryState,
    moduleId: string,
    contribution: CapabilityContribution,
): void {
    const { namespace, descriptors } = contribution;
    if (state.contributions.has(moduleId)) {
        throw new Error(`模块重复注册能力：${moduleId}`);
    }
    if (!NAMESPACE_PATTERN.test(namespace)) {
        throw new Error(`命名空间不合法：${namespace}（需匹配 ${NAMESPACE_PATTERN.source}）`);
    }
    if (descriptors.length === 0) {
        throw new Error(`模块 ${moduleId} 未声明任何能力`);
    }
    if (typeof contribution.createContext !== 'function') {
        throw new Error(`模块 ${moduleId} 未提供能力上下文工厂`);
    }
    for (const descriptor of descriptors) {
        assertDescriptorName(state, moduleId, namespace, descriptor);
    }
}

function handlersFor(state: RegistryState, moduleId: string): Promise<CapabilityHandlerMap> {
    const cached = state.handlersByModule.get(moduleId);
    if (cached) return cached;
    const contribution = state.contributions.get(moduleId);
    if (!contribution) throw new Error(`模块未注册能力：${moduleId}`);
    const pending = contribution.loadHandlers().catch((error: unknown) => {
        // 载入失败不缓存，允许后续重试。
        state.handlersByModule.delete(moduleId);
        throw error;
    });
    state.handlersByModule.set(moduleId, pending);
    return pending;
}

/** 描述与实现的键集合双向比对，任一方向有缺口即报错。 */
function assertParity(
    moduleId: string,
    contribution: CapabilityContribution,
    handlers: CapabilityHandlerMap,
): void {
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

export function createCapabilityRegistry(): CapabilityRegistry {
    const state: RegistryState = {
        byName: new Map(),
        contributions: new Map(),
        handlersByModule: new Map(),
    };

    function register(moduleId: string, contribution: CapabilityContribution): void {
        assertContribution(state, moduleId, contribution);
        for (const descriptor of contribution.descriptors) {
            state.byName.set(descriptor.name, { descriptor, moduleId });
        }
        state.contributions.set(moduleId, contribution);
    }

    function list(): CapabilityDescriptor[] {
        return [...state.byName.values()]
            .map((entry) => entry.descriptor)
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    async function validate(): Promise<void> {
        for (const [moduleId, contribution] of state.contributions) {
            assertParity(moduleId, contribution, await handlersFor(state, moduleId));
        }
    }

    async function invoke(name: string, args: CapabilityArgs, context: unknown): Promise<unknown> {
        const entry = state.byName.get(name);
        if (!entry) throw new Error(`未知能力：${name}`);
        const handler = (await handlersFor(state, entry.moduleId))[name];
        if (!handler) throw new Error(`能力未实现：${name}`);
        return handler(args, context);
    }

    async function dispatch(name: string, args: CapabilityArgs): Promise<unknown> {
        const entry = state.byName.get(name);
        if (!entry) throw new Error(`未知能力：${name}`);
        const contribution = state.contributions.get(entry.moduleId);
        if (!contribution) throw new Error(`模块未注册能力：${entry.moduleId}`);
        return invoke(name, args, await contribution.createContext());
    }

    function ownerOf(name: string): { moduleId: string; namespace: string } | undefined {
        const entry = state.byName.get(name);
        if (!entry) return undefined;
        return {
            moduleId: entry.moduleId,
            namespace: state.contributions.get(entry.moduleId)?.namespace ?? '',
        };
    }

    function clear(): void {
        state.byName.clear();
        state.contributions.clear();
        state.handlersByModule.clear();
    }

    return {
        register,
        list,
        has: (name) => state.byName.has(name),
        validate,
        invoke,
        dispatch,
        ownerOf,
        clear,
    };
}

/** 应用级单例；组合根向它注册各模块的能力。 */
export const capabilityRegistry = createCapabilityRegistry();
