import { describe, expect, it, vi } from 'vitest';
import type { CapabilityContribution, CapabilityDescriptor } from '@/shared/capabilities/types';
import { createCapabilityRegistry } from './registry';

const descriptor = (name: string): CapabilityDescriptor => ({
    name,
    description: `${name} 说明`,
    inputSchema: { type: 'object', properties: {} },
});

function contribution(
    overrides: Partial<CapabilityContribution> = {},
    loadHandlers: CapabilityContribution['loadHandlers'] = async () => ({
        tool_one: async () => 'ok',
        tool_two: async () => 'ok',
    }),
): CapabilityContribution {
    return {
        namespace: 'tool',
        descriptors: [descriptor('tool_one'), descriptor('tool_two')],
        loadHandlers: vi.fn(loadHandlers),
        ...overrides,
    };
}

describe('capabilityRegistry 注册校验', () => {
    it('注册后可列出描述，且不加载实现', () => {
        const registry = createCapabilityRegistry();
        const item = contribution();
        registry.register('demo', item);

        expect(registry.list().map((entry) => entry.name)).toEqual(['tool_one', 'tool_two']);
        expect(item.loadHandlers).not.toHaveBeenCalled();
        expect(registry.has('tool_one')).toBe(true);
    });

    it('能力名必须带本模块命名空间前缀', () => {
        const registry = createCapabilityRegistry();
        expect(() =>
            registry.register('demo', contribution({ descriptors: [descriptor('other_one')] })),
        ).toThrowError(/命名空间前缀/);
    });

    it('拒绝重复的能力名', () => {
        const registry = createCapabilityRegistry();
        registry.register('demo', contribution());
        expect(() => registry.register('demo2', contribution())).toThrowError(/能力名重复/);
    });

    it('拒绝重复注册同一模块', () => {
        const registry = createCapabilityRegistry();
        registry.register('demo', contribution());
        expect(() => registry.register('demo', contribution())).toThrowError(/重复注册/);
    });

    it('拒绝空描述与非法命名空间', () => {
        const registry = createCapabilityRegistry();
        expect(() => registry.register('demo', contribution({ descriptors: [] }))).toThrowError(
            /未声明任何能力/,
        );
        expect(() =>
            registry.register('demo', contribution({ namespace: 'Bad-Name' })),
        ).toThrowError(/命名空间不合法/);
    });
});

describe('capabilityRegistry 调度', () => {
    it('invoke 把参数与上下文透传给实现，且实现只载入一次', async () => {
        const registry = createCapabilityRegistry();
        const handler = vi.fn(async () => ({ done: true }));
        const item = contribution({}, async () => ({ tool_one: handler }));
        registry.register('demo', item);

        const context = { any: 'thing' };
        await expect(registry.invoke('tool_one', { a: 1 }, context)).resolves.toEqual({
            done: true,
        });
        await registry.invoke('tool_one', { a: 2 }, context);

        expect(handler).toHaveBeenNthCalledWith(1, { a: 1 }, context);
        expect(handler).toHaveBeenNthCalledWith(2, { a: 2 }, context);
        expect(item.loadHandlers).toHaveBeenCalledTimes(1);
    });

    it('未知能力直接抛出', async () => {
        const registry = createCapabilityRegistry();
        registry.register('demo', contribution());
        await expect(registry.invoke('nope', {}, {})).rejects.toThrowError(/未知能力/);
    });

    it('实现缺失时抛出，而不是静默成功', async () => {
        const registry = createCapabilityRegistry();
        registry.register(
            'demo',
            contribution({}, async () => ({ tool_one: async () => 'ok' })),
        );
        await expect(registry.invoke('tool_two', {}, {})).rejects.toThrowError(/能力未实现/);
    });
});

describe('capabilityRegistry 描述与实现一致性自检', () => {
    it('键集合一致时通过', async () => {
        const registry = createCapabilityRegistry();
        registry.register('demo', contribution());
        await expect(registry.validate()).resolves.toBeUndefined();
    });

    it('声明了但没实现时报错', async () => {
        const registry = createCapabilityRegistry();
        registry.register(
            'demo',
            contribution({}, async () => ({ tool_one: async () => 'ok' })),
        );
        await expect(registry.validate()).rejects.toThrowError(/缺少实现 \[tool_two\]/);
    });

    it('实现了但没声明时报错', async () => {
        const registry = createCapabilityRegistry();
        registry.register(
            'demo',
            contribution({}, async () => ({
                tool_one: async () => 'ok',
                tool_two: async () => 'ok',
                tool_extra: async () => 'ok',
            })),
        );
        await expect(registry.validate()).rejects.toThrowError(/缺少描述 \[tool_extra\]/);
    });
});

describe('capabilityRegistry 平台无关性', () => {
    it('注册接口接受任意模块 id 与命名空间，无需平台改造', async () => {
        const registry = createCapabilityRegistry();
        registry.register('another-module', {
            namespace: 'other',
            descriptors: [descriptor('other_ping')],
            loadHandlers: async () => ({ other_ping: async () => 'pong' }),
        });
        await expect(registry.invoke('other_ping', {}, {})).resolves.toBe('pong');
    });
});
