import { describe, expect, it } from 'vitest';
import { normalizeKcbpAddress, parseKcbpAddress, serializeKcbpAddress } from './kcbpAddress';

describe('parseKcbpAddress', () => {
    it('parses host, msgtype and query params', () => {
        expect(parseKcbpAddress('127.0.0.1:21000/150501?queue=req2&timeout=30')).toEqual({
            host: '127.0.0.1:21000',
            msgtype: '150501',
            queue: 'req2',
            timeout: '30',
        });
    });

    it('parses query params attached directly to host', () => {
        expect(parseKcbpAddress('127.0.0.1:21000?queue=req2&timeout=30')).toEqual({
            host: '127.0.0.1:21000',
            msgtype: '',
            queue: 'req2',
            timeout: '30',
        });
    });

    it('treats empty queue query as default queue', () => {
        expect(parseKcbpAddress('127.0.0.1:21000?queue=')).toEqual({
            host: '127.0.0.1:21000',
            msgtype: '',
            queue: 'req1',
            timeout: '',
        });
    });

    it('returns defaults for empty address', () => {
        expect(parseKcbpAddress('')).toEqual({
            host: '',
            msgtype: '',
            queue: 'req1',
            timeout: '',
        });
    });
});

describe('serializeKcbpAddress', () => {
    it('round-trips parsed address', () => {
        const parts = parseKcbpAddress('127.0.0.1:21000/150501?queue=req1&timeout=15');
        expect(serializeKcbpAddress(parts)).toBe('127.0.0.1:21000/150501?queue=req1&timeout=15');
    });
});

describe('normalizeKcbpAddress', () => {
    it('rewrites host-only query strings into canonical form', () => {
        expect(normalizeKcbpAddress('127.0.0.1:21000?queue=req2')).toBe(
            '127.0.0.1:21000?queue=req2',
        );
    });
});
