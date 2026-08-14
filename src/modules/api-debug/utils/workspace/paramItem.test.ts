import { describe, expect, it } from 'vitest';
import {
    createParamItem,
    isParamEnabled,
    normalizeParamItem,
    normalizeParamList,
} from './paramItem';

describe('paramItem', () => {
    it('treats only disabled as unchecked', () => {
        expect(isParamEnabled('string')).toBe(true);
        expect(isParamEnabled('file')).toBe(true);
        expect(isParamEnabled('CHAR(32)')).toBe(true);
        expect(isParamEnabled(undefined)).toBe(true);
        expect(isParamEnabled('disabled')).toBe(false);
    });

    it('normalizes KUAB SQL types to enabled string', () => {
        expect(
            normalizeParamItem({ name: 'custid', value: '1', type: 'CHAR(32)' as never }),
        ).toEqual({
            name: 'custid',
            value: '1',
            type: 'string',
        });
    });

    it('preserves explicit disabled and file types', () => {
        expect(normalizeParamItem({ name: 'a', value: '', type: 'disabled' })).toEqual({
            name: 'a',
            value: '',
            type: 'disabled',
        });
        expect(normalizeParamItem({ name: 'body', value: '@file:D:/a.zip', type: 'file' })).toEqual(
            {
                name: 'body',
                value: '@file:D:/a.zip',
                type: 'file',
            },
        );
    });

    it('creates enabled params by default', () => {
        expect(createParamItem('g_funcid', '150501')).toEqual({
            name: 'g_funcid',
            value: '150501',
            type: 'string',
        });
    });

    it('normalizes param lists', () => {
        expect(
            normalizeParamList([
                { name: 'a', value: '1', type: 'INT' as never },
                { name: 'b', value: '2', type: 'disabled' },
            ]),
        ).toEqual([
            { name: 'a', value: '1', type: 'string' },
            { name: 'b', value: '2', type: 'disabled' },
        ]);
    });
});
