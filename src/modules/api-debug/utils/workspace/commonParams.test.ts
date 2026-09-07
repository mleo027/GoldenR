import { describe, expect, it } from 'vitest';
import type { ParamItem } from '../../types/workspace';
import {
    mergeCommonParams,
    resolveCommonParamsById,
    stripMountedCommonParams,
} from './commonParams';

const p = (name: string, value: string): ParamItem => ({ name, value, type: 'string' });

describe('mergeCommonParams', () => {
    it('公共在前、case 在后，case 同名覆盖公共', () => {
        const merged = mergeCommonParams(
            [p('orgid', '0101'), p('brhid', '1')],
            [p('orgid', '0202')],
        );
        expect(merged).toEqual([p('brhid', '1'), p('orgid', '0202')]);
    });

    it('case 独有参数追加在公共参数之后', () => {
        const merged = mergeCommonParams([p('orgid', '0101')], [p('custid', '-1')]);
        expect(merged).toEqual([p('orgid', '0101'), p('custid', '-1')]);
    });

    it('公共为空时返回等价 case 参数', () => {
        const caseParams = [p('orgid', '0101')];
        expect(mergeCommonParams([], caseParams)).toEqual(caseParams);
    });

    it('不修改两个入参数组', () => {
        const common = [p('orgid', '0101')];
        const caseParams = [p('orgid', '0202')];
        mergeCommonParams(common, caseParams);
        expect(common).toEqual([p('orgid', '0101')]);
        expect(caseParams).toEqual([p('orgid', '0202')]);
    });
});

describe('stripMountedCommonParams', () => {
    it('剔除与公共参数同名且同值的行，保留覆盖行与 case 独有行', () => {
        const params = [p('orgid', '0101'), p('orgid', '0202'), p('custid', '-1')];
        expect(stripMountedCommonParams(params, [p('orgid', '0101')])).toEqual([
            p('orgid', '0202'),
            p('custid', '-1'),
        ]);
    });

    it('公共为空时原样返回', () => {
        const params = [p('orgid', '0101')];
        expect(stripMountedCommonParams(params, [])).toEqual(params);
    });
});

describe('resolveCommonParamsById', () => {
    const sets = [
        { id: 'a', name: 'A', params: [p('orgid', '0101')] },
        { id: 'b', name: 'B', params: [] },
    ];

    it('按 id 返回对应参数集的 params', () => {
        expect(resolveCommonParamsById(sets, 'a')).toEqual([p('orgid', '0101')]);
    });

    it('id 为空或集合不存在时返回空数组', () => {
        expect(resolveCommonParamsById(sets, undefined)).toEqual([]);
        expect(resolveCommonParamsById(sets, 'missing')).toEqual([]);
    });
});
