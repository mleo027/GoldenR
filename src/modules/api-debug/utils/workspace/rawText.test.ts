import { describe, expect, it } from 'vitest';
import type { ParamItem } from '../../types/workspace';
import { parseQuickFillText } from './paramText';
import {
    buildParamsRawText,
    resolveKgbpChannel,
    resolveRawMsgtype,
    serializeParamsToKcbpIni,
    serializeParamsToKgbpXml,
} from './rawText';

const param = (name: string, value: string, type: ParamItem['type'] = 'string'): ParamItem => ({
    name,
    value,
    type,
});

describe('resolveRawMsgtype', () => {
    it('prefers the address msgtype', () => {
        expect(resolveRawMsgtype(' 410411 ', [param('funcid', '999999')])).toBe('410411');
    });

    it('falls back to the funcid param when the address has no msgtype', () => {
        expect(resolveRawMsgtype('', [param('custid', '1'), param('funcid', '410411')])).toBe(
            '410411',
        );
    });

    it('returns empty when neither source has a value', () => {
        expect(resolveRawMsgtype('   ', [param('custid', '1')])).toBe('');
    });
});

describe('resolveKgbpChannel', () => {
    it('resolves custid value when clientsessionid references @custid', () => {
        expect(resolveKgbpChannel('@custid', [param('custid', '600100000570')])).toBe(
            '600100000570',
        );
    });

    it('returns empty for other clientsessionid values', () => {
        expect(resolveKgbpChannel('300000000001', [param('custid', '1')])).toBe('');
        expect(resolveKgbpChannel('@other', [param('other', '2')])).toBe('');
        expect(resolveKgbpChannel(undefined, [param('custid', '1')])).toBe('');
    });

    it('returns empty when custid param is missing', () => {
        expect(resolveKgbpChannel('@custid', [param('operid', '8888')])).toBe('');
    });
});

describe('serializeParamsToKcbpIni', () => {
    it('renders the title=funcid; prefix and enabled params', () => {
        const text = serializeParamsToKcbpIni(
            [param('funcid', '410411'), param('custid', '600100000570'), param('operid', '8888')],
            { title: '深圳普通买债券', msgtype: '410411' },
        );
        expect(text).toBe('深圳普通买债券=410411;funcid:410411,custid:600100000570,operid:8888');
    });

    it('marks disabled params with the # prefix', () => {
        const text = serializeParamsToKcbpIni(
            [param('funcid', '410411'), param('remark', 'x', 'disabled')],
            { title: 'T', msgtype: '410411' },
        );
        expect(text).toBe('T=410411;funcid:410411,#remark:x');
    });

    it('keeps spaces inside values (netaddr style)', () => {
        const text = serializeParamsToKcbpIni([param('netaddr', '127.0.0.1  abcdefg')], {
            title: 'T',
            msgtype: '410411',
        });
        expect(text).toBe('T=410411;netaddr:127.0.0.1  abcdefg');
    });

    it('round-trips Chinese param names through parseQuickFillText', () => {
        const source: ParamItem[] = [
            param('funcid', '410411'),
            param('中文参数', '测试值'),
            param('custid', '600100000570'),
        ];
        const text = serializeParamsToKcbpIni(source, { title: 'T', msgtype: '410411' });
        const outcome = parseQuickFillText(text);
        expect(outcome.ok).toBe(true);
        if (!outcome.ok) return;
        expect(outcome.params).toEqual(source);
    });

    it('omits the title prefix when the case title is empty', () => {
        const source: ParamItem[] = [param('funcid', '410411'), param('custid', '1')];
        const text = serializeParamsToKcbpIni(source, { title: '', msgtype: '410411' });
        expect(text).toBe('funcid:410411,custid:1');
        const outcome = parseQuickFillText(text);
        expect(outcome.ok).toBe(true);
        if (!outcome.ok) return;
        expect(outcome.params).toEqual(source);
    });

    it('round-trips through parseQuickFillText', () => {
        const source: ParamItem[] = [
            param('funcid', '410411'),
            param('custid', '600100000570'),
            param('netaddr', '127.0.0.1  abcdefg'),
            param('remark', 'off', 'disabled'),
        ];
        const text = serializeParamsToKcbpIni(source, {
            title: '深圳普通买债券',
            msgtype: '410411',
        });
        const outcome = parseQuickFillText(text);
        expect(outcome.ok).toBe(true);
        if (!outcome.ok) return;
        expect(outcome.title).toBe('深圳普通买债券');
        expect(outcome.msgtype).toBe('410411');
        expect(outcome.params).toEqual(source);
    });
});

describe('serializeParamsToKgbpXml', () => {
    it('renders the full lbm header and param template', () => {
        const text = serializeParamsToKgbpXml(
            [param('funcid', '410411'), param('custid', '600100000570')],
            {
                msgtype: '410411',
                describe: '6位委托-深A',
                service: 'fs-oms',
                nodeId: '1',
                channel: '600100000570',
            },
        );
        expect(text).toBe(
            [
                '<lbm name="410411" describe="6位委托-深A" service_name="fs-oms" node_id="1" channel="600100000570">',
                '    <param name="funcid" datatype="C" defaultvalue="410411" InHareSocketDataType="S" allownull="yes"/>',
                '    <param name="custid" datatype="C" defaultvalue="600100000570" InHareSocketDataType="S" allownull="yes"/>',
                '</lbm>',
            ].join('\n'),
        );
    });

    it('skips disabled params', () => {
        const text = serializeParamsToKgbpXml(
            [param('custid', '1'), param('remark', 'x', 'disabled')],
            { msgtype: '410411', describe: '', channel: '' },
        );
        expect(text).toContain('<param name="custid"');
        expect(text).not.toContain('remark');
    });

    it('renders empty header attributes as empty strings', () => {
        const text = serializeParamsToKgbpXml([param('custid', '1')], {
            msgtype: '410411',
            describe: '',
            channel: '',
        });
        expect(
            text.startsWith(
                '<lbm name="410411" describe="" service_name="" node_id="" channel="">',
            ),
        ).toBe(true);
    });

    it('round-trips through parseQuickFillText', () => {
        const source: ParamItem[] = [
            param('funcid', '410411'),
            param('custid', '600100000570'),
            param('trdpwd', ''),
            param('price', '104.20'),
        ];
        const text = serializeParamsToKgbpXml(source, {
            msgtype: '410411',
            describe: '6位委托-深A',
            service: 'fs-oms',
            nodeId: '1',
            channel: '600100000570',
        });
        const outcome = parseQuickFillText(text);
        expect(outcome.ok).toBe(true);
        if (!outcome.ok) return;
        expect(outcome.msgtype).toBe('410411');
        expect(outcome.title).toBe('6位委托-深A');
        expect(outcome.service).toBe('fs-oms');
        expect(outcome.nodeId).toBe('1');
        expect(outcome.params).toEqual(source);
    });
});

describe('buildParamsRawText', () => {
    it('merges common params before case params in the KCBP output', () => {
        const text = buildParamsRawText({
            protocol: 'KCBP',
            address: '127.0.0.1:21000/410411?queue=req1&timeout=15',
            tabName: '深圳普通买债券',
            params: [param('funcid', '410411'), param('qty', '1000')],
            commonParams: [param('operid', '8888'), param('orgid', '6001')],
        });
        expect(text).toBe('深圳普通买债券=410411;operid:8888,orgid:6001,funcid:410411,qty:1000');
    });

    it('lets case params override same-name common params', () => {
        const text = buildParamsRawText({
            protocol: 'KCBP',
            address: '127.0.0.1:21000/410411',
            tabName: 'T',
            params: [param('operid', '9999')],
            commonParams: [param('operid', '8888'), param('orgid', '6001')],
        });
        expect(text).toBe('T=410411;orgid:6001,operid:9999');
    });

    it('keeps only case params when no common params exist', () => {
        const text = buildParamsRawText({
            protocol: 'KCBP',
            address: '127.0.0.1:21000/410411',
            tabName: 'T',
            params: [param('funcid', '410411')],
            commonParams: [],
        });
        expect(text).toBe('T=410411;funcid:410411');
    });

    it('resolves channel from a custid provided by common params (KGBP)', () => {
        const text = buildParamsRawText({
            protocol: 'KGBP',
            address: 'gw:21000/410411?service=fs-oms&nodeid=1&clientsessionid=@custid',
            tabName: '6位委托-深A',
            params: [param('funcid', '410411')],
            commonParams: [param('custid', '600100000570')],
        });
        expect(text).toContain('channel="600100000570"');
        expect(text).toContain('<param name="custid" datatype="C" defaultvalue="600100000570"');
    });

    it('falls back to the funcid param for the lbm name when the address has no msgtype', () => {
        const text = buildParamsRawText({
            protocol: 'KGBP',
            address: 'gw:21000?service=fs-oms',
            tabName: 'T',
            params: [param('funcid', '410411'), param('custid', '1')],
            commonParams: [],
        });
        expect(text.startsWith('<lbm name="410411"')).toBe(true);
    });
});
