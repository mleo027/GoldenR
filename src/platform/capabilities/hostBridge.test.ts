import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CapabilityDescriptor } from '@/shared/capabilities/types';

const mocks = vi.hoisted(() => ({
    onInvoke: vi.fn(),
    respond: vi.fn(async () => undefined),
}));

vi.mock('@/runtime/capabilityFacade', () => ({
    capabilityHostBridge: { onInvoke: mocks.onInvoke, respond: mocks.respond },
}));

import { capabilityRegistry } from './registry';
import { startCapabilityHost } from './hostBridge';

const descriptor = (name: string): CapabilityDescriptor => ({
    name,
    description: `${name} 说明`,
    inputSchema: { type: 'object', properties: {} },
});

function registerDemo(
    handlers: Record<string, (args: Record<string, unknown>) => Promise<unknown>>,
): void {
    capabilityRegistry.register('demo', {
        namespace: 'demo',
        descriptors: Object.keys(handlers).map(descriptor),
        loadHandlers: async () => handlers,
        createContext: async () => ({ from: 'module' }),
    });
}

/** 取出宿主订阅时注册的回调。 */
function capturedOnInvoke(): (request: {
    requestId: string;
    name: string;
    args: Record<string, unknown>;
}) => void {
    return mocks.onInvoke.mock.calls[0][0] as never;
}

beforeEach(() => {
    capabilityRegistry.clear();
    mocks.onInvoke.mockReset();
    mocks.respond.mockReset();
    mocks.respond.mockResolvedValue(undefined);
});

describe('startCapabilityHost', () => {
    it('把请求转发到注册表，并回填成功结果', async () => {
        registerDemo({ demo_ping: async (args) => ({ pong: args.value }) });
        startCapabilityHost();

        capturedOnInvoke()({ requestId: 'r1', name: 'demo_ping', args: { value: 7 } });

        await vi.waitFor(() => expect(mocks.respond).toHaveBeenCalledTimes(1));
        expect(mocks.respond).toHaveBeenCalledWith({
            requestId: 'r1',
            ok: true,
            result: { pong: 7 },
        });
    });

    it('能力失败时以 ok:false 回填，而不是抛给传输层', async () => {
        registerDemo({
            demo_boom: async () => {
                throw new Error('场景不存在：s1');
            },
        });
        startCapabilityHost();

        capturedOnInvoke()({ requestId: 'r2', name: 'demo_boom', args: {} });

        await vi.waitFor(() => expect(mocks.respond).toHaveBeenCalledTimes(1));
        expect(mocks.respond).toHaveBeenCalledWith({
            requestId: 'r2',
            ok: false,
            error: '场景不存在：s1',
        });
    });

    it('未知能力也是普通失败，不是崩溃', async () => {
        startCapabilityHost();

        capturedOnInvoke()({ requestId: 'r3', name: 'demo_missing', args: {} });

        await vi.waitFor(() => expect(mocks.respond).toHaveBeenCalledTimes(1));
        expect(mocks.respond).toHaveBeenCalledWith({
            requestId: 'r3',
            ok: false,
            error: expect.stringContaining('未知能力') as unknown as string,
        });
    });

    it('回填失败不会产生未处理的 rejection', async () => {
        registerDemo({ demo_ping: async () => 'ok' });
        mocks.respond.mockRejectedValueOnce(new Error('bridge down'));
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        startCapabilityHost();

        capturedOnInvoke()({ requestId: 'r4', name: 'demo_ping', args: {} });

        await vi.waitFor(() => expect(errorSpy).toHaveBeenCalled());
        errorSpy.mockRestore();
    });
});
