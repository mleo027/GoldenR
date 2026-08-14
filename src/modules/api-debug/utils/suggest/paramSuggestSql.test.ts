import { describe, expect, it } from 'vitest';
import {
    analyzeSuggestSelectSql,
    buildSuggestCacheKey,
    describeColumnMappingIssue,
    extractSqlPlaceholderDefs,
    extractSqlPlaceholders,
    filterOptionsByKeyword,
    findParamValue,
    formatExecutedSqlPreview,
    formatSqlPlaceholderSummary,
    formatSqlPlaceholderToken,
    formatSqlPreview,
    formatSuggestDisplayLabel,
    mapRowsToOptions,
    prepareSuggestSql,
    resolveSqlBindings,
    summarizeSqlDependencies,
    validateSelectSql,
} from './paramSuggestSql';

describe('extractSqlPlaceholderDefs', () => {
    it('marks optional placeholders with trailing ?', () => {
        expect(
            extractSqlPlaceholderDefs(
                'select value from operator where orgid=@orgid? and market=@market',
            ),
        ).toEqual([
            { name: 'orgid', optional: true },
            { name: 'market', optional: false },
        ]);
    });

    it('treats placeholder as required when any occurrence is required', () => {
        expect(extractSqlPlaceholderDefs('where orgid=@orgid? or orgid=@orgid')).toEqual([
            { name: 'orgid', optional: false },
        ]);
    });
});

describe('formatSqlPlaceholderToken', () => {
    it('formats optional token with question mark', () => {
        expect(formatSqlPlaceholderToken({ name: 'orgid', optional: true })).toBe('@orgid?');
        expect(formatSqlPlaceholderToken({ name: 'custid', optional: false })).toBe('@custid');
    });
});

describe('formatSqlPlaceholderSummary', () => {
    it('groups required and optional placeholders', () => {
        expect(
            formatSqlPlaceholderSummary(
                'select value=operid from operator where custid=@custid and orgid=@orgid?',
            ),
        ).toBe('必填 @custid；可选 @orgid?');
    });
});

describe('formatSqlPreview', () => {
    it('inserts line breaks before major clauses', () => {
        expect(
            formatSqlPreview('select value=1 from t where market=@market and orgid=@orgid'),
        ).toContain('\nwhere');
    });
});

describe('extractSqlPlaceholders', () => {
    it('extracts @ placeholders from SQL', () => {
        expect(
            extractSqlPlaceholders('select a, b from t where market=@market and secuid=@secuid'),
        ).toEqual(['market', 'secuid']);
    });
});

describe('validateSelectSql', () => {
    it('accepts select queries', () => {
        expect(validateSelectSql('select * from bsconfig')).toEqual({ ok: true });
    });

    it('rejects non-select statements', () => {
        expect(validateSelectSql('delete from bsconfig')).toEqual({
            ok: false,
            reason: '仅允许 SELECT 查询',
        });
    });

    it('rejects forbidden keywords', () => {
        expect(validateSelectSql('select 1; drop table t')).toEqual({
            ok: false,
            reason: 'SQL 包含不允许的关键字',
        });
    });

    it('rejects multiple where clauses', () => {
        expect(
            validateSelectSql(
                'select value=custid, remark=fundname where run.dbo.fundinfo where fundid = @fundid',
            ),
        ).toEqual({
            ok: false,
            reason: 'SQL 包含多个 WHERE，请检查是否将 FROM 误写为 WHERE',
        });
    });

    it('rejects where without from', () => {
        expect(validateSelectSql('select value = 1 where id = 1')).toEqual({
            ok: false,
            reason: 'SQL 含有 WHERE 但缺少 FROM，表名前应使用 FROM 而非 WHERE',
        });
    });
});

describe('findParamValue', () => {
    it('matches param names case-insensitively', () => {
        expect(findParamValue({ Market: '1' }, 'market')).toBe('1');
    });
});

describe('resolveSqlBindings', () => {
    it('resolves literal and param bindings', () => {
        const result = resolveSqlBindings(
            [
                { name: 'market', optional: false },
                { name: 'status', optional: false },
            ],
            {
                status: { type: 'literal', value: 'A' },
                market: { type: 'param', name: 'market' },
            },
            { market: '1' },
        );

        expect(result).toEqual({
            values: { market: '1', status: 'A' },
            pendingDeps: [],
            optionalEmpty: [],
        });
    });

    it('returns pending deps for missing required context params', () => {
        const result = resolveSqlBindings([{ name: 'market', optional: false }], undefined, {});

        expect(result.values).toEqual({});
        expect(result.pendingDeps).toEqual(['market']);
        expect(result.optionalEmpty).toEqual([]);
    });

    it('skips optional placeholders when context param is empty', () => {
        const result = resolveSqlBindings([{ name: 'orgid', optional: true }], undefined, {});

        expect(result).toEqual({
            values: {},
            pendingDeps: [],
            optionalEmpty: ['orgid'],
        });
    });

    it('binds optional placeholders when context param is filled', () => {
        const result = resolveSqlBindings([{ name: 'orgid', optional: true }], undefined, {
            orgid: '1001',
        });

        expect(result).toEqual({
            values: { orgid: '1001' },
            pendingDeps: [],
            optionalEmpty: [],
        });
    });
});

describe('prepareSuggestSql', () => {
    const baseSql = 'select value=operid, remark=opername from operator where orgid = @orgid?';

    it('removes optional where clause when param is empty', () => {
        expect(prepareSuggestSql(baseSql, ['orgid'])).toBe(
            'select value=operid, remark=opername from operator',
        );
    });

    it('keeps optional where clause token normalized when param is provided', () => {
        expect(prepareSuggestSql(baseSql, [])).toBe(
            'select value=operid, remark=opername from operator where orgid = @orgid',
        );
    });

    it('removes trailing optional and keeps preceding where conditions', () => {
        const sql = 'select value from t where market = @market and orgid = @orgid?';
        expect(prepareSuggestSql(sql, ['orgid'])).toBe(
            'select value from t where market = @market',
        );
    });

    it('removes dangling where before order by', () => {
        const sql = 'select value from t where orgid = @orgid? order by value';
        expect(prepareSuggestSql(sql, ['orgid'])).toBe('select value from t order by value');
    });

    it('promotes remaining and to where after removing leading optional condition', () => {
        const sql = 'select value from t where orgid = @orgid? and market = @market';
        expect(prepareSuggestSql(sql, ['orgid'])).toBe(
            'select value from t where market = @market',
        );
    });
});

describe('buildSuggestCacheKey', () => {
    it('builds stable cache keys', () => {
        expect(
            buildSuggestCacheKey('bsflag', {
                market: '1',
                secuid: '123',
            }),
        ).toBe('bsflag|market=1&secuid=123');
    });
});

describe('formatSuggestDisplayLabel', () => {
    it('combines value and remark as value-remark', () => {
        expect(formatSuggestDisplayLabel('1001', '总部')).toBe('1001-总部');
    });

    it('keeps remark when already prefixed with value', () => {
        expect(formatSuggestDisplayLabel('1001', '1001-总部')).toBe('1001-总部');
    });
});

describe('mapRowsToOptions', () => {
    it('maps fixed value/remark columns to options', () => {
        expect(
            mapRowsToOptions([
                { value: '1001', remark: '总部' },
                { value: '1002', remark: '分部' },
            ]),
        ).toEqual([
            { value: '1001', label: '1001-总部' },
            { value: '1002', label: '1002-分部' },
        ]);
    });

    it('maps value-only rows when remark is absent', () => {
        expect(mapRowsToOptions([{ value: '1d' }, { value: '1o' }])).toEqual([
            { value: '1d', label: '1d' },
            { value: '1o', label: '1o' },
        ]);
    });

    it('matches columns case-insensitively', () => {
        expect(mapRowsToOptions([{ VALUE: 'B', REMARK: 'Buy' }])).toEqual([
            { value: 'B', label: 'B-Buy' },
        ]);
    });
});

describe('describeColumnMappingIssue', () => {
    it('detects missing value column', () => {
        expect(describeColumnMappingIssue([{ orgid: '1001' }])).toContain('value');
    });

    it('allows rows without remark column', () => {
        expect(describeColumnMappingIssue([{ value: '1001' }])).toBeUndefined();
    });
});

describe('formatExecutedSqlPreview', () => {
    it('appends bound params as comment line', () => {
        expect(
            formatExecutedSqlPreview('select value from t where orgid = @orgid', {
                orgid: '1001',
            }),
        ).toBe('select value from t where orgid = @orgid\n-- 参数: @orgid = "1001"');
    });
});

describe('filterOptionsByKeyword', () => {
    it('filters by value and label', () => {
        const options = [
            { value: 'B', label: 'Buy' },
            { value: 'S', label: 'Sell' },
        ];

        expect(filterOptionsByKeyword(options, 'sell')).toEqual([{ value: 'S', label: 'Sell' }]);
    });
});

describe('summarizeSqlDependencies', () => {
    it('splits required and optional placeholders', () => {
        expect(
            summarizeSqlDependencies('select value from t where market=@market and orgid=@orgid?'),
        ).toEqual({
            required: ['market'],
            optional: ['orgid'],
        });
    });
});

describe('analyzeSuggestSelectSql', () => {
    it('detects value and remark aliases', () => {
        const result = analyzeSuggestSelectSql(
            'select value = operid, remark = opername from operator where orgid = @orgid',
        );
        expect(result.structure.ok).toBe(true);
        expect(result.hasValueAlias).toBe(true);
        expect(result.hasRemarkAlias).toBe(true);
    });

    it('flags missing value alias', () => {
        const result = analyzeSuggestSelectSql('select id, name from operator');
        expect(result.structure.ok).toBe(true);
        expect(result.hasValueAlias).toBe(false);
        expect(result.hasRemarkAlias).toBe(false);
    });

    it('reports invalid structure', () => {
        const result = analyzeSuggestSelectSql('delete from operator');
        expect(result.structure.ok).toBe(false);
    });
});
