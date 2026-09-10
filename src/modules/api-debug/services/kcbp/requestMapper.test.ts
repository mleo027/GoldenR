import { describe, expect, it } from 'vitest';
import type { KcbpResponseData } from '../../../../types/kcbp';
import type { TabData } from '../../types/workspace';
import { buildKcbpCallOutcome, buildKcbpRequest } from './requestMapper';

const baseParts = {
    host: '10.0.0.2:9100',
    msgtype: '150501',
    queue: 'req1',
    timeout: '20',
};

describe('buildKcbpRequest (KGBP)', () => {
    it('parses pure integer nodeid/clientsessionid', () => {
        const payload = buildKcbpRequest(
            { ...baseParts, service: 'srv-demo', nodeId: '3', clientSessionId: '88' },
            '150501',
            {},
            {},
            'KGBP',
        );
        expect(payload.type).toBe('KGBP');
        expect(payload.param.nodeid).toBe(3);
        expect(payload.param.clientsessionid).toBe(88);
    });

    it('returns undefined for non-pure-integer values instead of silent coercion', () => {
        const payload = buildKcbpRequest(
            { ...baseParts, service: 'srv-demo', nodeId: '12.5', clientSessionId: 'abc' },
            '150501',
            {},
            {},
            'KGBP',
        );
        expect(payload.param.nodeid).toBeUndefined();
        expect(payload.param.clientsessionid).toBeUndefined();
    });

    it('resolves @field references for ClientSessionId', () => {
        const payload = buildKcbpRequest(
            { ...baseParts, service: 'srv-demo', nodeId: '3', clientSessionId: '@custid' },
            '150501',
            { custid: '600100000570' },
            {},
            'KGBP',
        );
        expect(payload.param.clientsessionid).toBe(600100000570);
    });
});

describe('buildKcbpRequest (KCBP)', () => {
    it('omits type for the KCBP branch (defaults to KCBP downstream)', () => {
        const payload = buildKcbpRequest(baseParts, '150501', {}, {}, 'KCBP');
        expect(payload.type).toBeUndefined();
        expect(payload.connection.reqqueue).toBe('req1');
        expect(payload.param.nodeid).toBeUndefined();
    });
});

describe('buildKcbpRequest (KUAB)', () => {
    it('uses the KUAB native route and carries the selected profile', () => {
        const payload = buildKcbpRequest(
            { ...baseParts, kuabConfigId: 'prod' },
            'KCAS.login',
            { USER_ID: '8888' },
            {},
            'KUAB',
        );
        expect(payload.type).toBe('KUAB');
        expect(payload.connection.kuabConfigId).toBe('prod');
        expect(payload.param.fields).toEqual({ USER_ID: '8888' });
    });
});

describe('buildKcbpCallOutcome', () => {
    const tab = { params: [] as TabData['params'] } as Pick<TabData, 'params'>;

    const raw = (overrides: Partial<KcbpResponseData> = {}): KcbpResponseData => ({
        code: '0',
        msg: 'ok',
        data: [{ name: 'DATA', rows: [{ custid: '1' }] }],
        stats: { timecost: 12, rows: 1 },
        ...overrides,
    });

    it('normalizes raw.data into resultSets passthrough (no grid flattening)', () => {
        const outcome = buildKcbpCallOutcome(tab, '127.0.0.1:21000/150501', 'fallback', raw());
        expect(outcome.response.resultSets).toEqual([{ name: 'DATA', rows: [{ custid: '1' }] }]);
        expect(outcome.response.code).toBe('0');
        expect(outcome.response.message).toBe('ok');
        expect(outcome.response.stats).toEqual({ timecost: 12, rows: 1 });
        expect(typeof outcome.response.calledAt).toBe('number');
    });

    it('derives msgtype from the address and falls back to the case name', () => {
        const outcome = buildKcbpCallOutcome(tab, '127.0.0.1:21000/150501', 'unused', raw());
        expect(outcome.msgtype).toBe('150501');

        const fallbackOutcome = buildKcbpCallOutcome(tab, '127.0.0.1:21000/', 'myCase', raw());
        expect(fallbackOutcome.msgtype).toBe('myCase');
    });

    it('marks success for zero business code', () => {
        const outcome = buildKcbpCallOutcome(tab, '127.0.0.1:21000/150501', 'fallback', raw());
        expect(outcome.status.kind).toBe('success');
        expect(outcome.missingParam).toBeNull();
        expect(outcome.nextParams).toBe(tab.params);
    });

    it('marks non-zero business code as error', () => {
        const outcome = buildKcbpCallOutcome(
            tab,
            '127.0.0.1:21000/150501',
            'fallback',
            raw({ code: '-1', msg: 'timeout' }),
        );
        expect(outcome.status.kind).toBe('error');
        expect(outcome.status.businessCode).toBe('-1');
    });

    it('merges a missing param extracted from result set rows', () => {
        const outcome = buildKcbpCallOutcome(
            tab,
            '127.0.0.1:21000/150501',
            'fallback',
            raw({
                code: '90001',
                msg: '没有fundid项的数据 fundid=12345',
                data: [],
            }),
        );
        expect(outcome.missingParam).toEqual({ name: 'fundid', value: '12345' });
        expect(outcome.nextParams).toEqual([{ name: 'fundid', value: '12345', type: 'string' }]);
    });

    it('scans result set rows for a missing param when top-level message has no match', () => {
        const outcome = buildKcbpCallOutcome(
            tab,
            '127.0.0.1:21000/150501',
            'fallback',
            raw({
                code: '-1',
                msg: 'failed',
                data: [
                    { name: '', rows: [] },
                    { name: 'ERR', rows: [{ code: '90001', msg: '入参 market 缺失 market: SH' }] },
                ],
            }),
        );
        expect(outcome.missingParam).toEqual({ name: 'market', value: 'SH' });
    });
});
