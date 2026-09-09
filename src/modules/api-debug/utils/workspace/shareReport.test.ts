import { describe, expect, it } from 'vitest';
import type { ResponseData } from '../../types/workspace';
import type { ParamsRawTextOptions } from './rawText';
import { buildShareReportFilename, buildShareReportHtml } from './shareReport';

const baseOptions: ParamsRawTextOptions = {
    protocol: 'KCBP',
    address: '127.0.0.1:21000/410411?queue=req1&timeout=15',
    tabName: '深圳普通买债券',
    params: [
        { name: 'funcid', value: '410411', type: 'string' },
        { name: 'custid', value: '600100000570', type: 'string' },
    ],
    commonParams: [],
};

const successResponse: ResponseData = {
    code: '0',
    message: 'ok',
    resultSets: [
        {
            name: 'data',
            rows: [
                { stockcode: '000001', price: '10.10', qty: '1000' },
                { stockcode: '131000', price: '99.50', qty: '200' },
            ],
        },
    ],
};

describe('buildShareReportHtml', () => {
    it('uses case name plus msgtype as the report title', () => {
        const html = buildShareReportHtml({ ...baseOptions, response: successResponse });
        expect(html).toContain('深圳普通买债券');
        expect(html).toContain('410411');
        expect(html).toContain('<title>');
    });

    it('falls back to funcid param when the address has no msgtype', () => {
        const html = buildShareReportHtml({
            ...baseOptions,
            address: '',
            response: successResponse,
        });
        expect(html).toContain('410411');
    });

    it('contains the merged raw params text (KCBP INI)', () => {
        const html = buildShareReportHtml({
            ...baseOptions,
            commonParams: [{ name: 'fundid', value: 'A12345', type: 'string' }],
            response: successResponse,
        });
        expect(html).toContain('深圳普通买债券=410411;');
        expect(html).toContain('fundid:A12345');
        expect(html).toContain('custid:600100000570');
    });

    it('escapes KGBP XML raw text for HTML display', () => {
        const html = buildShareReportHtml({
            ...baseOptions,
            protocol: 'KGBP',
            address: 'lbm://410411?service=fs-oms&nodeid=1',
            response: successResponse,
        });
        expect(html).toContain('&lt;lbm');
        expect(html).not.toContain('<lbm name');
    });

    it('includes code and message summary with success badge', () => {
        const html = buildShareReportHtml({ ...baseOptions, response: successResponse });
        expect(html).toContain('code=0');
        expect(html).toContain('ok');
        expect(html).toContain('badge--ok');
    });

    it('marks non-zero code as error badge', () => {
        const html = buildShareReportHtml({
            ...baseOptions,
            response: { code: '-1', message: '资金不足', resultSets: [] },
        });
        expect(html).toContain('badge--error');
        expect(html).toContain('资金不足');
    });

    it('renders every result set section with its name', () => {
        const html = buildShareReportHtml({
            ...baseOptions,
            response: {
                code: '0',
                message: 'ok',
                resultSets: [
                    { name: 'data', rows: [{ stockcode: '000001' }] },
                    { name: 'extra', rows: [{ fee: '5' }] },
                ],
            },
        });
        expect(html).toContain('data');
        expect(html).toContain('extra');
        expect(html.match(/class="rs"/g)?.length).toBe(2);
    });

    it('derives columns in first-appearance order', () => {
        const html = buildShareReportHtml({
            ...baseOptions,
            response: {
                code: '0',
                message: 'ok',
                resultSets: [{ name: 'data', rows: [{ b: '2', a: '1' }, { c: '3' }] }],
            },
        });
        const dataJson = html.match(
            /<script type="application\/json" class="rs-data">([\s\S]*?)<\/script>/,
        )?.[1];
        expect(dataJson).toBeTruthy();
        const parsed = JSON.parse(dataJson as string);
        expect(parsed.columns).toEqual(['b', 'a', 'c']);
        expect(parsed.rows).toEqual([{ b: '2', a: '1' }, { c: '3' }]);
    });

    it('escapes HTML-sensitive cell values', () => {
        const html = buildShareReportHtml({
            ...baseOptions,
            response: {
                code: '0',
                message: 'ok',
                resultSets: [{ name: 'data', rows: [{ remark: '<script>alert(1)</script>' }] }],
            },
        });
        expect(html).not.toContain('<script>alert(1)');
        // JSON 数据块内的 < 需转义为 \u003c，防止 </script> 提前闭合
        expect(html).toContain('\\u003cscript');
    });

    it('shows a placeholder when there is no response yet', () => {
        const html = buildShareReportHtml({ ...baseOptions, response: null });
        expect(html).toContain('暂无应答');
    });

    it('embeds the interactive table script with pagination', () => {
        const html = buildShareReportHtml({ ...baseOptions, response: successResponse });
        expect(html).toContain('data-page-size');
        expect(html).toContain('aria-sort');
        expect(html).not.toMatch(/https?:\/\//);
    });
});

describe('buildShareReportFilename', () => {
    it('joins case name and msgtype', () => {
        expect(buildShareReportFilename('深圳普通买债券', '410411')).toBe(
            '深圳普通买债券-410411.html',
        );
    });

    it('sanitizes illegal filename characters', () => {
        expect(buildShareReportFilename('a/b\\c:d*e?f"g<h>i|j', '410411')).toBe(
            'a-b-c-d-e-f-g-h-i-j-410411.html',
        );
    });

    it('falls back when both parts are empty', () => {
        expect(buildShareReportFilename('', '')).toBe('分享报告.html');
    });
});
