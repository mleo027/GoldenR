import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkerInboundMessage, WorkerOutboundMessage } from './protocol';

let messages: WorkerOutboundMessage[];
let workerScope: {
    postMessage: (message: WorkerOutboundMessage) => void;
    onmessage?: (event: MessageEvent<WorkerInboundMessage>) => void;
};

async function send(message: WorkerInboundMessage) {
    workerScope.onmessage?.({ data: message } as MessageEvent<WorkerInboundMessage>);
    await vi.waitFor(() => {
        expect(messages.some((item) => item.type === 'finished' || item.type === 'inspected')).toBe(
            true,
        );
    });
}

describe('automation worker DSL', () => {
    beforeEach(async () => {
        messages = [];
        workerScope = { postMessage: (message) => messages.push(message) };
        vi.stubGlobal('self', workerScope);
        vi.resetModules();
        await import('./automation.worker');
    });

    it('registers metadata and rejects duplicate scenario declarations', async () => {
        await send({
            type: 'inspect',
            id: 'inspect',
            script: `scenario({ inputs: { amount: input.number({ required: true, min: 0 }) } }, async () => {});`,
        });
        expect(messages[0]).toMatchObject({
            type: 'inspected',
            metadata: { inputs: { amount: { type: 'number', required: true, min: 0 } } },
        });

        messages = [];
        await send({
            type: 'inspect',
            id: 'duplicate',
            script: `scenario({}, async () => {}); scenario({}, async () => {});`,
        });
        expect(messages[0]).toMatchObject({ type: 'inspected', error: expect.any(String) });
    });

    it('records nested steps, variables, matchers and soft failures', async () => {
        await send({
            type: 'run',
            id: 'run',
            inputs: { amount: 2 },
            script: `scenario({}, async (t) => {
                await t.step('outer', async () => {
                    await t.step('inner', () => {
                        t.vars.set('value', t.input.amount);
                        t.expect(t.vars.all(), '变量已设置').toMatchObject({ value: 2 });
                        t.expect.soft([1], '软断言').toHaveLength(2);
                    });
                });
            });`,
        });
        expect(messages.at(-1)).toMatchObject({
            type: 'finished',
            status: 'failed',
            error: '存在未通过的软断言',
        });
        const progress = messages.filter((item) => item.type === 'progress');
        expect(progress.some((item) => JSON.stringify(item).includes('设置变量 value'))).toBe(true);
        expect(
            progress.filter((item) => JSON.stringify(item).includes('step-started')),
        ).toHaveLength(2);
    });

    it('stops on a hard assertion and executes cleanup in reverse order', async () => {
        await send({
            type: 'run',
            id: 'cleanup',
            inputs: {},
            script: `scenario({}, async (t) => {
                t.cleanup('first', () => t.info('first'));
                t.cleanup('second', () => t.info('second'));
                t.expect(false, '失败').toBeTruthy();
                t.info('unreachable');
            });`,
        });
        const serialized = messages.map((message) => JSON.stringify(message));
        const second = serialized.findIndex((value) => value.includes('second'));
        const first = serialized.findIndex((value) => value.includes('first'));
        expect(second).toBeGreaterThan(-1);
        expect(first).toBeGreaterThan(second);
        expect(serialized.some((value) => value.includes('unreachable'))).toBe(false);
    });
});
