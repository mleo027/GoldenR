import { describe, expect, it } from 'vitest';
import { isCommonParamSetFile } from './commonParamsData';

describe('isCommonParamSetFile', () => {
    it('接受合法的参数集文件结构', () => {
        expect(
            isCommonParamSetFile({
                sets: [
                    {
                        id: 'a',
                        name: '交易公共',
                        params: [{ name: 'orgid', value: '0101', type: 'string' }],
                    },
                ],
            }),
        ).toBe(true);
    });

    it('拒绝缺 sets 数组的结构', () => {
        expect(isCommonParamSetFile({})).toBe(false);
        expect(isCommonParamSetFile({ sets: 'no' })).toBe(false);
    });

    it('拒绝参数集字段缺失的结构', () => {
        expect(isCommonParamSetFile({ sets: [{ id: 'a' }] })).toBe(false);
        expect(isCommonParamSetFile({ sets: [{ id: 'a', name: 'A', params: 'no' }] })).toBe(false);
    });
});
