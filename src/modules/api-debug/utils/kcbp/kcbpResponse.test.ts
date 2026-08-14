import { describe, expect, it } from 'vitest';
import type { ParamItem, ResponseData } from '../../types/workspace';
import {
    extractFieldsFromMsg,
    getBusinessRow,
    mergeExtractedFieldsIntoParams,
    parseKcbpResponseStatus,
} from './kcbpResponse';

describe('getBusinessRow', () => {
    it('returns first row with msg field', () => {
        const row = { code: '0', msg: 'ok' };
        expect(getBusinessRow([row])).toEqual(row);
    });

    it('returns null when no msg row', () => {
        expect(getBusinessRow([{ custid: '1' }])).toBeNull();
        expect(getBusinessRow([])).toBeNull();
    });
});

describe('parseKcbpResponseStatus', () => {
    it('marks transport -1 as error', () => {
        const response: ResponseData = { code: '-1', message: 'timeout', data: [] };
        expect(parseKcbpResponseStatus(response).kind).toBe('error');
    });

    it('parses business row success', () => {
        const response: ResponseData = {
            code: '0',
            message: 'ok',
            data: [{ code: '0', msg: 'done', level: 0 }],
        };
        const status = parseKcbpResponseStatus(response);
        expect(status.kind).toBe('success');
        expect(status.businessMsg).toBe('done');
        expect(status.hasBusinessRow).toBe(true);
    });

    it('marks 90001 as warning', () => {
        const response: ResponseData = {
            code: '0',
            message: 'ok',
            data: [{ code: '90001', msg: '没有fundid项的数据' }],
        };
        expect(parseKcbpResponseStatus(response).kind).toBe('warning');
    });

    it('marks level >= 2 as error', () => {
        const response: ResponseData = {
            code: '0',
            message: 'ok',
            data: [{ code: '100', msg: 'fail', level: 2 }],
        };
        expect(parseKcbpResponseStatus(response).kind).toBe('error');
    });

    it('falls back to transport when no business row', () => {
        const response: ResponseData = { code: '0', message: 'ok', data: [{ custid: '1' }] };
        const status = parseKcbpResponseStatus(response);
        expect(status.kind).toBe('success');
        expect(status.hasBusinessRow).toBe(false);
        expect(status.businessMsg).toBe('ok');
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
