import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CapabilityInvokeRequest } from '../../../src/shared/capabilities/host';
import { CapabilityInvoker } from './capabilityInvoker';

function createHarness(timeoutMs = 50) {
    const sent: CapabilityInvokeRequest[] = [];
    let counter = 0;
    const invoker = new CapabilityInvoker({
        send: (request) => sent.push(request),
        timeoutMs,
        createRequestId: () => `req-${++counter}`,
    });
    return { invoker, sent };
}

afterEach(() => {
    vi.useRealTimers();
});

describe('CapabilityInvoker 请求与应答', () => {
    it('发出的请求带唯一 id，成功回填后解析为该结果', async () => {
        const { invoker, sent } = createHarness();

        const pending = invoker.invoke('automation_list_scenarios', { a: 1 });

        expect(sent).toEqual([
            { requestId: 'req-1', name: 'automation_list_scenarios', args: { a: 1 } },
        ]);
        expect(invoker.settle({ requestId: 'req-1', ok: true, result: ['s1'] })).toBe(true);
        await expect(pending).resolves.toEqual(['s1']);
        expect(invoker.pendingCount).toBe(0);
    });

    it('失败回填以错误呈现，且不吞掉原因', async () => {
        const { invoker } = createHarness();

        const pending = invoker.invoke('automation_read_scenario', { scenarioId: 'x' });
        invoker.settle({ requestId: 'req-1', ok: false, error: '场景不存在：x' });

        await expect(pending).rejects.toThrowError('场景不存在：x');
    });

    it('失败回填没有原因时给出兜底文案', async () => {
        const { invoker } = createHarness();

        const pending = invoker.invoke('automation_read_scenario');
        invoker.settle({ requestId: 'req-1', ok: false });

        await expect(pending).rejects.toThrowError('能力调用失败');
    });

    it('未知或重复回填不生效', async () => {
        const { invoker } = createHarness();

        expect(invoker.settle({ requestId: 'nope', ok: true, result: 1 })).toBe(false);

        const pending = invoker.invoke('automation_list_scenarios');
        expect(invoker.settle({ requestId: 'req-1', ok: true, result: 1 })).toBe(true);
        expect(invoker.settle({ requestId: 'req-1', ok: true, result: 2 })).toBe(false);
        await expect(pending).resolves.toBe(1);
    });

    it('缺少能力名时直接拒绝', async () => {
        const { invoker, sent } = createHarness();
        await expect(invoker.invoke('')).rejects.toThrowError(/缺少能力名/);
        expect(sent).toHaveLength(0);
    });
});

describe('CapabilityInvoker 超时与在途清理', () => {
    it('超时后拒绝并清空在途请求', async () => {
        vi.useFakeTimers();
        const { invoker } = createHarness(1000);

        const pending = invoker.invoke('automation_run_scenario');
        expect(invoker.pendingCount).toBe(1);
        vi.advanceTimersByTime(1000);

        await expect(pending).rejects.toThrowError(
            /能力调用超时（1000ms）：automation_run_scenario/,
        );
        expect(invoker.pendingCount).toBe(0);
    });

    it('回填后不再因超时而重复结算', async () => {
        vi.useFakeTimers();
        const { invoker } = createHarness(1000);

        const pending = invoker.invoke('automation_list_scenarios');
        invoker.settle({ requestId: 'req-1', ok: true, result: 'ok' });
        vi.advanceTimersByTime(5000);

        await expect(pending).resolves.toBe('ok');
    });

    it('渲染层失联时批量中止在途请求', async () => {
        const { invoker } = createHarness(60_000);

        const first = invoker.invoke('automation_list_scenarios');
        const second = invoker.invoke('automation_list_environments');
        expect(invoker.pendingCount).toBe(2);

        invoker.rejectAll('渲染层正在重载，能力调用中止');

        await expect(first).rejects.toThrowError('渲染层正在重载，能力调用中止');
        await expect(second).rejects.toThrowError('渲染层正在重载，能力调用中止');
        expect(invoker.pendingCount).toBe(0);
    });

    it('发送失败时立即拒绝，不留下等超时的请求', async () => {
        const invoker = new CapabilityInvoker({
            send: () => {
                throw new Error('应用没有可用窗口，无法执行能力调用');
            },
            timeoutMs: 60_000,
            createRequestId: () => 'req-1',
        });

        await expect(invoker.invoke('automation_list_scenarios')).rejects.toThrowError(
            /没有可用窗口/,
        );
        expect(invoker.pendingCount).toBe(0);
    });
});
