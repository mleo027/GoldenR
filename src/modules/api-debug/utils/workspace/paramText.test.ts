import { describe, expect, it } from 'vitest';
import { parseParamsText, parseQuickFillText, serializeParamsToText } from './paramText';

describe('serializeParamsToText', () => {
    it('serializes enabled and disabled params', () => {
        expect(
            serializeParamsToText([
                { name: 'g_serverid', value: '1', type: 'string' },
                { name: 'g_disabled', value: '0', type: 'disabled' },
            ]),
        ).toBe('g_serverid=1\n# g_disabled=0');
    });
});

describe('parseParamsText', () => {
    it('parses line-based key=value pairs', () => {
        expect(
            parseParamsText(`g_serverid=1
g_funcid=150501`),
        ).toEqual({
            ok: true,
            params: [
                { name: 'g_serverid', value: '1', type: 'string' },
                { name: 'g_funcid', value: '150501', type: 'string' },
            ],
        });
    });

    it('parses disabled params from commented lines', () => {
        expect(parseParamsText('# g_disabled=0')).toEqual({
            ok: true,
            params: [{ name: 'g_disabled', value: '0', type: 'disabled' }],
        });
    });

    it('parses ini-style comma separated pairs', () => {
        expect(parseParamsText('g_serverid:1,g_funcid:150501')).toEqual({
            ok: true,
            params: [
                { name: 'g_serverid', value: '1', type: 'string' },
                { name: 'g_funcid', value: '150501', type: 'string' },
            ],
        });
    });

    it('round-trips serialized text', () => {
        const params = [
            { name: 'g_serverid', value: '1', type: 'string' as const },
            { name: 'g_disabled', value: '0', type: 'disabled' as const },
        ];
        const parsed = parseParamsText(serializeParamsToText(params));
        expect(parsed).toEqual({ ok: true, params });
    });

    it('preserves spaces inside comma-separated values', () => {
        expect(parseParamsText('netaddr:127.0.0.1  abcdefg,orgid:6001')).toEqual({
            ok: true,
            params: [
                { name: 'netaddr', value: '127.0.0.1  abcdefg', type: 'string' },
                { name: 'orgid', value: '6001', type: 'string' },
            ],
        });
    });
});

describe('parseQuickFillText', () => {
    const kcbpSample =
        '深圳普通买=410411;funcid:410411,custid:600100000570,custorgid:6001,trdpwd:,netaddr:127.0.0.1  abcdefg,orgid:6001,servicetype:,ext:,custcert:,netaddr2:127.0.0.2  HIJKLMN,ticket:,gmticket:,operid:8888,operpwd:,operway:0,bsflag:0B,market:0,secuid:0899435898,stkcode:002500,price:6.00,qty:100,fortuneid:,fundid:600100000570,ordergroup:,seat:231500,remark:,bankcode:,testorderid:,';

    it('parses title-prefixed semicolon comma format', () => {
        const outcome = parseQuickFillText(kcbpSample);
        expect(outcome.ok).toBe(true);
        if (!outcome.ok) return;

        expect(outcome.params.find((item) => item.name === 'funcid')).toEqual({
            name: 'funcid',
            value: '410411',
            type: 'string',
        });
        expect(outcome.params.find((item) => item.name === 'netaddr')).toEqual({
            name: 'netaddr',
            value: '127.0.0.1  abcdefg',
            type: 'string',
        });
        expect(outcome.params.find((item) => item.name === 'netaddr2')).toEqual({
            name: 'netaddr2',
            value: '127.0.0.2  HIJKLMN',
            type: 'string',
        });
        expect(outcome.params.find((item) => item.name === 'trdpwd')).toEqual({
            name: 'trdpwd',
            value: '',
            type: 'string',
        });
        expect(outcome.params.some((item) => item.name === '深圳普通买')).toBe(false);
    });

    it('parses log format with bracketed values', () => {
        const text = `[2026-06-25 14:33:44] [225453] [15ms  ] [      0 Row(s)] [写子步骤日志        ] [清算步骤日志处理成功!]
           [入参:clearflow ] [数值:A         ] [说明:清算流程                      ]
           [入参:market    ] [数值:X         ] [说明:交易市场                      ]
           [入参:remark    ] [数值:证券交收序号[6001]－[7536]交收成功!] [说明:操作失败原因                  ]`;

        const outcome = parseQuickFillText(text);
        expect(outcome).toEqual({
            ok: true,
            msgtype: '225453',
            params: [
                { name: 'funcid', value: '225453', type: 'string' },
                { name: 'clearflow', value: 'A', type: 'string' },
                { name: 'market', value: 'X', type: 'string' },
                {
                    name: 'remark',
                    value: '证券交收序号[6001]－[7536]交收成功!',
                    type: 'string',
                },
            ],
        });
    });

    it('parses msgtype from log header when no param lines exist', () => {
        const text =
            '[2026-06-25 15:10:41] [225452] [4281ms] [      0 Row(s)] [写清算步骤日志      ] [清算流程处理日志处理成功';

        expect(parseQuickFillText(text)).toEqual({
            ok: true,
            msgtype: '225452',
            params: [{ name: 'funcid', value: '225452', type: 'string' }],
        });
    });

    it('returns error for empty text', () => {
        expect(parseQuickFillText('   ')).toEqual({
            ok: false,
            error: '请粘贴待识别的入参文本',
        });
    });
});
