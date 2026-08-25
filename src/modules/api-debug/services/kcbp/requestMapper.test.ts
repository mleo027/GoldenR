import { describe, expect, it } from 'vitest';
import { buildKcbpRequest } from './requestMapper';

const baseParts = {
    host: '10.0.0.2:9100',
    msgtype: '150501',
    queue: 'req1',
    timeout: '20',
};

describe('buildKcbpRequest (KGBP)', () => {
    it('parses pure integer nodeid/sessionid', () => {
        const payload = buildKcbpRequest(
            { ...baseParts, service: 'srv-demo', nodeId: '3', sessionId: '88' },
            '150501',
            {},
            {},
            'KGBP',
        );
        expect(payload.type).toBe('KGBP');
        expect(payload.param.nodeid).toBe(3);
        expect(payload.param.sessionid).toBe(88);
    });

    it('returns undefined for non-pure-integer values instead of silent coercion', () => {
        const payload = buildKcbpRequest(
            { ...baseParts, service: 'srv-demo', nodeId: '12.5', sessionId: 'abc' },
            '150501',
            {},
            {},
            'KGBP',
        );
        expect(payload.param.nodeid).toBeUndefined();
        expect(payload.param.sessionid).toBeUndefined();
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
