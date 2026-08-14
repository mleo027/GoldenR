import { describe, expect, it } from 'vitest';
import { FlowRuntime, MAX_FLOW_RUN_CASE_DEPTH } from './flow';

describe('FlowRuntime', () => {
    it('stores and retrieves values', () => {
        const flow = new FlowRuntime();
        flow.set('orderId', '123');
        expect(flow.get('orderId')).toBe('123');
        expect(flow.snapshot()).toEqual({ orderId: '123' });
    });

    it('limits runCase nesting depth', () => {
        const flow = new FlowRuntime();
        for (let index = 0; index < MAX_FLOW_RUN_CASE_DEPTH; index += 1) {
            flow.enterRunCase();
        }
        expect(() => flow.enterRunCase()).toThrow(/嵌套超过/);
    });
});
