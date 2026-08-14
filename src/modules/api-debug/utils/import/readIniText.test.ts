import { describe, expect, it } from 'vitest';
import iconv from 'iconv-lite';
import { decodeIniBuffer } from '../../../../../electron/readIniText';

describe('decodeIniBuffer', () => {
    it('decodes utf-8 content', () => {
        const text = '上海普通买=410411;funcid:410411';
        const buffer = new TextEncoder().encode(text);
        expect(decodeIniBuffer(buffer)).toBe(text);
    });

    it('decodes utf-8 bom content', () => {
        const text = '深圳普通买=410411';
        const body = new TextEncoder().encode(text);
        const buffer = new Uint8Array([0xef, 0xbb, 0xbf, ...body]);
        expect(decodeIniBuffer(buffer)).toBe(text);
    });

    it('decodes gbk content', () => {
        const text = '上海普通买债券=410411;funcid:410411';
        const buffer = Uint8Array.from(iconv.encode(text, 'gbk'));
        expect(decodeIniBuffer(buffer)).toBe(text);
    });
});
