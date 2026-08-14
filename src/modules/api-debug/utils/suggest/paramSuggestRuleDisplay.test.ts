import { describe, expect, it } from 'vitest';
import type { ParamFieldRule } from '../../types/paramSuggest';
import {
    buildSqlSummary,
    explainRuleMatchReasons,
    filterFieldGroups,
    filterRulesByFieldSearch,
    formatRuleResolutionTooltip,
    getRuleRankInField,
    summarizeFieldHealth,
} from './paramSuggestRuleDisplay';
import { groupRulesByField } from './paramSuggestResolve';

function makeRule(id: string, field: string, sql: string): ParamFieldRule {
    return {
        id,
        field,
        type: 'select',
        enabled: true,
        datasource: { type: 'sql', db: 'mssql', sql },
    };
}

describe('filterFieldGroups', () => {
    const groups = groupRulesByField([
        makeRule('1', 'stkcode', 'select value=stkcode from t where market=@market'),
        makeRule('2', 'market', 'select value=market from t'),
        makeRule('3', 'custid', 'select value=custid from t where fundid=@fundid'),
    ]);

    it('filters by field keyword', () => {
        expect(filterFieldGroups(groups, 'stk')).toHaveLength(1);
        expect(filterFieldGroups(groups, 'stk')[0]?.field).toBe('stkcode');
    });
});

describe('filterRulesByFieldSearch', () => {
    const rules = [makeRule('1', 'stkcode', 'select 1'), makeRule('2', 'market', 'select 2')];

    it('returns all rules when keyword empty', () => {
        expect(filterRulesByFieldSearch(rules, '')).toHaveLength(2);
    });

    it('returns matched rules only', () => {
        expect(filterRulesByFieldSearch(rules, 'market')).toHaveLength(1);
        expect(filterRulesByFieldSearch(rules, 'market')[0]?.field).toBe('market');
    });
});

describe('buildSqlSummary', () => {
    it('truncates long sql', () => {
        const sql =
            'select value=stkcode, remark=stkname from run.dbo.stktrd where market = @market';
        expect(buildSqlSummary(sql, 24)).toBe('select value=stkcode, re...');
    });
});

describe('explainRuleMatchReasons', () => {
    it('describes filled dependencies', () => {
        const rule = makeRule('1', 'stkcode', 'select 1 from t where market=@market');
        expect(explainRuleMatchReasons(rule, { market: '1' })).toContain('依赖 market 已填写');
    });
});

describe('getRuleRankInField', () => {
    it('returns 1-based rank among enabled field rules', () => {
        const rules = [
            makeRule('a', 'orgid', 'select 1'),
            { ...makeRule('b', 'orgid', 'select 2'), priority: 5 },
        ];
        expect(getRuleRankInField(rules, 'orgid', 'b')).toBe(1);
    });
});

describe('summarizeFieldHealth', () => {
    it('detects missing enabled rules', () => {
        expect(
            summarizeFieldHealth([{ ...makeRule('1', 'fundid', 'select 1'), enabled: false }]),
        ).toBe('no-enabled');
    });
});

describe('formatRuleResolutionTooltip', () => {
    it('includes rank and priority', () => {
        const text = formatRuleResolutionTooltip(
            { ...makeRule('1', 'orgid', 'select 1'), priority: 3 },
            1,
        );
        expect(text).toContain('当前顺位：#1');
        expect(text).toContain('priority = 3');
    });
});
