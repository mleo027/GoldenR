import { describe, expect, it } from 'vitest';
import type { ParamItem, ResponseData } from '../../types/workspace';
import {
    extractFieldsFromMsg,
    mergeExtractedFieldsIntoParams,
    parseKcbpResponseStatus,
} from './kcbpResponse';

describe('parseKcbpResponseStatus', () => {
    it('marks transport -1 as error', () => {
        const response: ResponseData = { code: '-1', message: 'timeout', data: [] };
        expect(parseKcbpResponseStatus(response).kind).toBe('error');
    });

    it('uses top-level code and message as the business status', () => {
        const response: ResponseData = {
            code: '0',
            message: 'ok',
            level: '0',
            data: [{ custid: '1' }],
        };
        const status = parseKcbpResponseStatus(response);
        expect(status.kind).toBe('success');
        expect(status.businessCode).toBe('0');
        expect(status.businessMsg).toBe('ok');
        expect(status.businessLevel).toBe('0');
        expect(status.hasBusinessRow).toBe(false);
    });

    it('ignores code, msg and level inside data rows', () => {
        const response: ResponseData = {
            code: '0',
            message: 'Success',
            data: [{ code: -1003, msg: 'call remote backend failed', level: '888' }],
        };
        const status = parseKcbpResponseStatus(response);
        expect(status.kind).toBe('success');
        expect(status.businessCode).toBe('0');
        expect(status.businessMsg).toBe('Success');
        expect(status.hasBusinessRow).toBe(false);
    });

    it('marks top-level 90001 as warning', () => {
        const response: ResponseData = {
            code: '90001',
            message: '没有fundid项的数据',
            level: '0',
            data: [],
        };
        expect(parseKcbpResponseStatus(response).kind).toBe('warning');
    });

    it('marks top-level level >= 2 as error', () => {
        const response: ResponseData = { code: '100', message: 'fail', level: '2', data: [] };
        expect(parseKcbpResponseStatus(response).kind).toBe('error');
    });

    it('marks top-level negative code as error', () => {
        const response: ResponseData = { code: '-1003', message: 'fail', level: '888', data: [] };
        expect(parseKcbpResponseStatus(response).kind).toBe('error');
    });

    it('falls back to transport when level is absent', () => {
        const response: ResponseData = { code: '0', message: 'ok', data: [] };
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
