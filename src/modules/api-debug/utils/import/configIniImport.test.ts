import { describe, expect, it } from 'vitest';
import { parseConfigIni, parseIniCaseLine, parseIniConnectionHost } from './configIniImport';

const SAMPLE_LINE =
    '上海普通买债券=410411;funcid:410411,custid:600100000570,trdpwd:,netaddr:127.0.0.1  abcdefg,orgid:6001';

describe('configIniImport', () => {
    it('parses connection host from ini header', () => {
        const host = parseIniConnectionHost(`
[连接参数]
IPAddress =127.0.0.1
IPPort   =21000
`);
        expect(host).toBe('127.0.0.1:21000');
    });

    it('parses title msgtype and params from case line', () => {
        const caseItem = parseIniCaseLine(SAMPLE_LINE, '127.0.0.1:21000', 0);

        expect(caseItem?.name).toBe('上海普通买债券');
        expect(caseItem?.address).toBe('127.0.0.1:21000/410411?queue=req1&timeout=15');
        expect(caseItem?.params).toEqual([
            { name: 'funcid', value: '410411', type: 'string' },
            { name: 'custid', value: '600100000570', type: 'string' },
            { name: 'trdpwd', value: '', type: 'string' },
            { name: 'netaddr', value: '127.0.0.1  abcdefg', type: 'string' },
            { name: 'orgid', value: '6001', type: 'string' },
        ]);
    });

    it('parses per-case queue and timeout from msgtype query', () => {
        const caseItem = parseIniCaseLine(
            '测试查询=150501?queue=req2&timeout=30;fundid:8',
            '127.0.0.1:21000',
            0,
        );

        expect(caseItem?.address).toBe('127.0.0.1:21000/150501?queue=req2&timeout=30');
        expect(caseItem?.params).toEqual([{ name: 'fundid', value: '8', type: 'string' }]);
    });

    it('unescapes delimiters in titles and parameter values', () => {
        const caseItem = parseIniCaseLine(
            '\\[测试\\=名称\\]=150501;field\\,name:a\\,b\\;c\\:d',
            '127.0.0.1:21000',
            0,
        );

        expect(caseItem?.name).toBe('[测试=名称]');
        expect(caseItem?.params).toEqual([
            { name: 'field,name', value: 'a,b;c:d', type: 'string' },
        ]);
    });

    it('parses full ini content', () => {
        const content = `
[连接参数]
IPAddress =127.0.0.1
IPPort   =21000
深圳普通买=410411;funcid:410411,custid:1
上海普通买债券=410411;funcid:410411,qty:1000
`;
        const cases = parseConfigIni(content);
        expect(cases).toHaveLength(2);
        expect(cases[0].name).toBe('深圳普通买');
        expect(cases[1].name).toBe('上海普通买债券');
        expect(cases[0].address).toContain('127.0.0.1:21000/410411');
    });
});
