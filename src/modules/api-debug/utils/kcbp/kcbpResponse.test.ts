import { describe, expect, it } from 'vitest';
import type { ParamItem, ResponseData } from '../../types/workspace';
import {
    extractFieldsFromMsg,
    mergeExtractedFieldsIntoParams,
    parseKcbpResponseStatus,
} from './kcbpResponse';

describe('parseKcbpResponseStatus', () => {
    it('marks code 0 as success', () => {
        const response: ResponseData = {
            code: '0',
            message: 'ok',
            data: [{ custid: '1' }],
        };
        const status = parseKcbpResponseStatus(response);
        expect(status.kind).toBe('success');
        expect(status.businessCode).toBe('0');
        expect(status.businessMsg).toBe('ok');
        expect(status.hasBusinessRow).toBe(false);
    });

    it('marks any non-zero code as error', () => {
        const response: ResponseData = {
            code: '-1',
            message: 'timeout',
            data: [],
        };
        const status = parseKcbpResponseStatus(response);
        expect(status.kind).toBe('error');
        expect(status.businessCode).toBe('-1');
        expect(status.businessMsg).toBe('timeout');
        expect(status.hasBusinessRow).toBe(false);
    });
});

describe('extractFieldsFromMsg', () => {
    it('parses bracket segments', () => {
        expect(extractFieldsFromMsg('错误 [fundid=123, market=SH]')).toEqual({
            fundid: '123',
            market: 'SH',
        });
    });

    it('returns empty object when no brackets', () => {
        expect(extractFieldsFromMsg('plain message')).toEqual({});
    });
});

describe('mergeExtractedFieldsIntoParams', () => {
    it('maps keys to existing param names and adds g_ prefix', () => {
        const params: ParamItem[] = [{ name: 'g_funcid', value: '150501', type: 'string' }];
        const next = mergeExtractedFieldsIntoParams(params, { funcid: '150502', serverid: '1' });
        expect(next.find((p) => p.name === 'g_funcid')?.value).toBe('150502');
        expect(next.find((p) => p.name === 'g_serverid')?.value).toBe('1');
    });

    it('skips empty extracted values', () => {
        const params: ParamItem[] = [{ name: 'fundid', value: '1', type: 'string' }];
        expect(mergeExtractedFieldsIntoParams(params, { fundid: '' })).toBe(params);
    });
});
