import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CapabilityInvokeRequest } from '../../../src/shared/capabilities/host';
import { configureCapabilityChannel, invokeCapabilityInRenderer } from './capabilityChannel';

beforeEach(() => {
    vi.resetModules();
});

describe('capabilityChannel', () => {
    it('未装配传输时报明确错误，而不是静默挂起', async () => {
        const fresh = await import('./capabilityChannel');
        await expect(fresh.invokeCapabilityInRenderer('demo_ping')).rejects.toThrowError(
            /能力通道尚未就绪/,
        );
    });

    it('装配后把请求交给传输，并可被回填', async () => {
        const sent: CapabilityInvokeRequest[] = [];
        const invoker = configureCapabilityChannel((request) => sent.push(request));

        const pending = invokeCapabilityInRenderer('demo_ping', { value: 1 });
        expect(sent).toHaveLength(1);
        expect(sent[0]).toMatchObject({ name: 'demo_ping', args: { value: 1 } });

        invoker.settle({ requestId: sent[0].requestId, ok: true, result: 'pong' });
        await expect(pending).resolves.toBe('pong');
    });

    it('重新装配会替换传输，旧在途请求不再挂在新通道上', async () => {
        const first = configureCapabilityChannel(() => undefined);
        void first.invoke('demo_ping');
        expect(first.pendingCount).toBe(1);

        const second = configureCapabilityChannel(() => undefined);
        expect(second.pendingCount).toBe(0);
    });
});
