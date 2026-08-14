import { describe, expect, it } from 'vitest';
import type { ParamFieldRule } from '../../types/paramSuggest';
import {
    groupRulesByField,
    formatMatchedRuleHint,
    formatRuleBriefLabel,
    formatRuleMatchSummary,
    getRuleMatchTier,
    mergeMatchWhenWithSqlDeps,
    deriveMatchWhenFromSqlChange,
    normalizeParamFieldRule,
    parseRuleFields,
    parseWhenConditions,
    resolveSuggestRule,
    resolveSuggestRules,
    ruleMatchesContext,
    ruleSqlDepsSatisfied,
    ruleSpecificity,
    stringifyWhenConditions,
} from './paramSuggestResolve';

function makeRule(
    partial: Partial<ParamFieldRule> & Pick<ParamFieldRule, 'id' | 'field'> & { sql: string },
): ParamFieldRule {
    const { sql, ...rest } = partial;
    return {
        type: 'select',
        enabled: true,
        priority: 0,
        datasource: {
            type: 'sql',
            db: 'mssql',
            sql,
        },
        ...rest,
    };
}

describe('ruleSpecificity', () => {
    it('scores when conditions above SQL deps', () => {
        const global = makeRule({ id: 'g', field: 'bsflag', sql: 'select 1' });
        const scoped = makeRule({
            id: 's',
            field: 'bsflag',
            sql: 'select 2',
            match: { when: { market: '' } },
        });

        expect(ruleSpecificity(scoped)).toBeGreaterThan(ruleSpecificity(global));
    });

    it('scores required SQL placeholders above optional-only rules', () => {
        const fallback = makeRule({ id: 'f', field: 'orgid', sql: 'select value=orgid from org' });
        const optionalOnly = makeRule({
            id: 'o',
            field: 'orgid',
            sql: 'select value=orgid from fundinfo where fundid = @fundid?',
        });
        const required = makeRule({
            id: 'r',
            field: 'orgid',
            sql: 'select value=orgid from fundinfo where fundid = @fundid',
        });

        expect(ruleSpecificity(optionalOnly)).toBeGreaterThan(ruleSpecificity(fallback));
        expect(ruleSpecificity(required)).toBeGreaterThan(ruleSpecificity(optionalOnly));
    });
});

describe('resolveSuggestRule', () => {
    const rules: ParamFieldRule[] = [
        makeRule({ id: 'global', field: 'bsflag', sql: 'select value = 1', priority: 0 }),
        makeRule({
            id: 'by-market',
            field: 'bsflag',
            sql: 'select value = 2',
            priority: 0,
            match: { when: { market: '' } },
        }),
        makeRule({
            id: 'specific',
            field: 'bsflag',
            sql: 'select value = 4',
            priority: 5,
            match: { when: { market: '', secuid: '' } },
        }),
    ];

    it('falls back to global rule', () => {
        const resolved = resolveSuggestRule(rules, {
            field: 'bsflag',
            contextParams: {},
        });
        expect(resolved?.id).toBe('global');
    });

    it('prefers when-scoped rule when required param is filled', () => {
        const resolved = resolveSuggestRule(rules, {
            field: 'bsflag',
            contextParams: { market: '1' },
        });
        expect(resolved?.id).toBe('by-market');
    });

    it('prefers more specific when rule', () => {
        const resolved = resolveSuggestRule(rules, {
            field: 'bsflag',
            contextParams: { market: '1', secuid: '123' },
        });
        expect(resolved?.id).toBe('specific');
    });

    it('uses priority within same specificity', () => {
        const localRules: ParamFieldRule[] = [
            makeRule({
                id: 'low',
                field: 'orgid',
                sql: 'a',
                priority: 1,
                match: { when: { market: '' } },
            }),
            makeRule({
                id: 'high',
                field: 'orgid',
                sql: 'b',
                priority: 9,
                match: { when: { market: '' } },
            }),
        ];
        const resolved = resolveSuggestRule(localRules, {
            field: 'orgid',
            contextParams: { market: '1' },
        });
        expect(resolved?.id).toBe('high');
    });

    it('skips rules when required SQL deps are missing', () => {
        const localRules: ParamFieldRule[] = [
            makeRule({
                id: 'by-fundid',
                field: 'orgid',
                sql: 'select value=orgid from fundinfo where fundid = @fundid',
            }),
            makeRule({
                id: 'by-custid',
                field: 'orgid',
                sql: 'select value=orgid from customer where custid = @custid',
            }),
            makeRule({
                id: 'fallback',
                field: 'orgid',
                sql: 'select value=orgid, remark=orgname from org',
            }),
        ];

        expect(
            resolveSuggestRule(localRules, {
                field: 'orgid',
                contextParams: { custid: '100145879' },
            })?.id,
        ).toBe('by-custid');

        expect(
            resolveSuggestRule(localRules, {
                field: 'orgid',
                contextParams: { fundid: '1001' },
            })?.id,
        ).toBe('by-fundid');

        expect(
            resolveSuggestRule(localRules, {
                field: 'orgid',
                contextParams: {},
            })?.id,
        ).toBe('fallback');
    });

    it('allows optional SQL placeholders to be empty', () => {
        const rule = makeRule({
            id: 'optional-orgid',
            field: 'orgid',
            sql: 'select value=orgid from org where orgid = @orgid?',
        });

        expect(ruleSqlDepsSatisfied(rule, {})).toBe(true);
        expect(ruleMatchesContext(rule, { field: 'orgid', contextParams: {} })).toBe(true);
    });

    it('skips required deps but keeps rules with only optional placeholders', () => {
        const localRules: ParamFieldRule[] = [
            makeRule({
                id: 'by-fundid',
                field: 'orgid',
                sql: 'select value=orgid from fundinfo where fundid = @fundid',
            }),
            makeRule({
                id: 'optional-fundid',
                field: 'orgid',
                sql: 'select value=orgid from fundinfo where fundid = @fundid?',
            }),
            makeRule({
                id: 'fallback',
                field: 'orgid',
                sql: 'select value=orgid from org',
            }),
        ];

        expect(
            resolveSuggestRule(localRules, {
                field: 'orgid',
                contextParams: {},
            })?.id,
        ).toBe('optional-fundid');

        expect(ruleMatchesContext(localRules[0], { field: 'orgid', contextParams: {} })).toBe(
            false,
        );
        expect(ruleMatchesContext(localRules[1], { field: 'orgid', contextParams: {} })).toBe(true);
    });

    it('returns all matching rules in resolution order for sequential fallback', () => {
        const localRules: ParamFieldRule[] = [
            makeRule({
                id: 'by-fundid',
                field: 'secuid',
                sql: 'select value=secuid, remark=name from fund where fundid = @fundid',
            }),
            makeRule({
                id: 'fallback',
                field: 'secuid',
                sql: 'select value=secuid, remark=name from secuid',
            }),
        ];

        expect(
            resolveSuggestRules(localRules, {
                field: 'secuid',
                contextParams: { fundid: '1001' },
            }).map((rule) => rule.id),
        ).toEqual(['by-fundid', 'fallback']);
    });
});

describe('normalizeParamFieldRule', () => {
    it('strips legacy msgtype from match', () => {
        const normalized = normalizeParamFieldRule(
            makeRule({
                id: 'legacy',
                field: 'bsflag',
                sql: 'select 1',
                match: { msgtype: '150501', when: { market: '' } } as ParamFieldRule['match'],
            }),
            0,
        );

        expect(normalized.match).toEqual({ when: { market: '' } });
    });

    it('drops match when only msgtype existed', () => {
        const normalized = normalizeParamFieldRule(
            makeRule({
                id: 'legacy',
                field: 'bsflag',
                sql: 'select 1',
                match: { msgtype: '150501' } as ParamFieldRule['match'],
            }),
            0,
        );

        expect(normalized.match).toBeUndefined();
    });
});

describe('groupRulesByField', () => {
    it('groups and sorts rules by field and resolution order', () => {
        const groups = groupRulesByField([
            makeRule({ id: '1', field: 'orgid', sql: 'a', priority: 1 }),
            makeRule({ id: '2', field: 'bsflag', sql: 'b', priority: 2 }),
            makeRule({ id: '3', field: 'orgid', sql: 'c', priority: 5 }),
            makeRule({
                id: '4',
                field: 'orgid',
                sql: 'd',
                priority: 1,
                match: { when: { market: '' } },
            }),
        ]);

        expect(groups).toHaveLength(2);
        expect(groups[0].field).toBe('bsflag');
        expect(groups[1].rules.map((rule) => rule.id)).toEqual(['4', '3', '1']);
    });

    it('keeps multi-field rules in one shared group', () => {
        const shared = makeRule({
            id: 'shared',
            field: 'operid',
            fields: ['operid', 'auditoperid'],
            sql: 'select value=operid from operator',
        });
        const groups = groupRulesByField([shared]);

        expect(groups).toHaveLength(1);
        expect(groups[0].field).toBe('operid, auditoperid');
        expect(groups[0].rules[0]?.id).toBe('shared');
    });
});

describe('multi-field rules', () => {
    it('matches any configured field name', () => {
        const rule = makeRule({
            id: 'shared',
            field: 'operid',
            fields: ['operid', 'auditoperid'],
            sql: 'select 1',
        });

        expect(ruleMatchesContext(rule, { field: 'operid', contextParams: {} })).toBe(true);
        expect(ruleMatchesContext(rule, { field: 'auditoperid', contextParams: {} })).toBe(true);
        expect(ruleMatchesContext(rule, { field: 'orgid', contextParams: {} })).toBe(false);
    });

    it('parses comma-separated field input', () => {
        expect(parseRuleFields('operid, auditoperid')).toEqual(['operid', 'auditoperid']);
    });
});

describe('parseWhenConditions', () => {
    it('parses param names without caring about values', () => {
        expect(parseWhenConditions('market, secuid')).toEqual({ market: '', secuid: '' });
        expect(parseWhenConditions('market=1, secuid=abc')).toEqual({ market: '', secuid: '' });
        expect(stringifyWhenConditions({ market: '', secuid: '' })).toBe('market, secuid');
    });
});

describe('mergeMatchWhenWithSqlDeps', () => {
    it('merges required sql placeholders with manual when deps', () => {
        expect(
            mergeMatchWhenWithSqlDeps(
                'select value=orgid from fundinfo where fundid = @fundid',
                'market',
            ),
        ).toBe('fundid, market');
    });

    it('ignores optional sql placeholders', () => {
        expect(
            mergeMatchWhenWithSqlDeps(
                'select value=orgid from org where orgid = @orgid?',
                'market',
            ),
        ).toBe('market');
    });

    it('replaces partial placeholder deps while typing sql', () => {
        const sql = 'select value=market from run.dbo.stktrd where stkcode = @stkcode';
        expect(deriveMatchWhenFromSqlChange(sql, 's, st, stk, stkcode', ['s', 'st', 'stk'])).toBe(
            'stkcode',
        );
        expect(deriveMatchWhenFromSqlChange(sql, 'stkcode, market', ['stkcode'])).toBe(
            'stkcode, market',
        );
    });
});

describe('formatRuleMatchSummary', () => {
    it('includes required sql placeholders without match.when', () => {
        const rule = makeRule({
            id: 'r',
            field: 'custid',
            sql: 'select value=custid from fundinfo where fundid = @fundid',
        });

        expect(formatRuleMatchSummary(rule)).toEqual(['需已填 fundid']);
        expect(getRuleMatchTier(rule)).toBe('when');
    });
});

describe('formatRuleBriefLabel', () => {
    it('builds readable rule summary without internal id', () => {
        const rule = makeRule({
            id: 'rule-mqlrx64k-xbjqcq',
            field: 'custid',
            fields: ['custid'],
            sql: 'select value = custid, remark = fundname from run.dbo.fundinfo where fundid = @fundid',
            priority: 0,
        });

        expect(formatRuleBriefLabel(rule)).toBe('字段 custid · 需已填 fundid');
        expect(formatMatchedRuleHint(rule)).toContain('字段 custid · 需已填 fundid');
        expect(formatMatchedRuleHint(rule)).toContain('配置 SQL:');
        expect(formatMatchedRuleHint(rule)).not.toContain('rule-mqlrx64k');
    });
});
