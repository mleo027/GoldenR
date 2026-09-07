import { describe, expect, it, vi } from 'vitest';
import type { ParamItem } from '../../types/workspace';
import { invokeKcbpCall } from './executeCase';

const p = (name: string, value: string): ParamItem => ({ name, value, type: 'string' });

function makeTab(params: ParamItem[]) {
    return {
        id: 't1',
        name: 'case',
        protocol: 'KCBP',
        address: '127.0.0.1:21000/851502?queue=req1&timeout=300',
        params,
        createdAt: 0,
        updatedAt: 0,
    };
}

function makeCallKcbp() {
    return vi.fn(async (payload: { param: { fields: Record<string, string> } }) => {
        void payload;
        return {
            code: '000000',
            msg: 'ok',
            data: [],
            stats: { timecost: 1, rows: 0 },
        };
    });
}

describe('invokeKcbpCall 公共参数合并（UI 模式）', () => {
    it('发送的 fields 含公共参数，case 同名覆盖；nextParams 保持 case-only', async () => {
        const callKcbp = makeCallKcbp();
        const outcome = await invokeKcbpCall(makeTab([p('orgid', '0202')]), 'ui', {
            electronDeps: { callKcbp, queryScriptSql: vi.fn() } as never,
            commonParams: [p('orgid', '0101'), p('brhid', '1')],
        });

        const payload = callKcbp.mock.calls[0][0] as {
            param: { fields: Record<string, string> };
        };
        expect(payload.param.fields.orgid).toBe('0202');
        expect(payload.param.fields.brhid).toBe('1');
        expect(outcome.nextParams).toEqual([p('orgid', '0202')]);
        expect(outcome.effectiveParams).toEqual([p('brhid', '1'), p('orgid', '0202')]);
    });

    it('未传 commonParams 时行为不变', async () => {
        const callKcbp = makeCallKcbp();
        const outcome = await invokeKcbpCall(makeTab([p('orgid', '0202')]), 'ui', {
            electronDeps: { callKcbp, queryScriptSql: vi.fn() } as never,
        });

        const payload = callKcbp.mock.calls[0][0] as {
            param: { fields: Record<string, string> };
        };
        expect(payload.param.fields.orgid).toBe('0202');
        expect(outcome.nextParams).toEqual([p('orgid', '0202')]);
        expect(outcome.effectiveParams).toEqual([p('orgid', '0202')]);
    });
});
