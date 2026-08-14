import type { ParamFieldRule } from '../../types/paramSuggest';
import type { RuleFieldGroup } from './paramSuggestResolve';
import {
    getRuleDependencyKeys,
    getRuleFields,
    groupRulesByField,
    ruleAppliesToField,
    sortRulesForDisplay,
    summarizeFieldGroup,
} from './paramSuggestResolve';
import { paramValueExists } from './paramSuggestSql';

export function filterFieldGroups(groups: RuleFieldGroup[], keyword: string): RuleFieldGroup[] {
    const trimmed = keyword.trim().toLowerCase();
    if (!trimmed) return groups;
    return groups.filter((group) => {
        if (group.field.toLowerCase().includes(trimmed)) return true;
        return group.rules.some((rule) =>
            getRuleFields(rule).some((field) => field.toLowerCase().includes(trimmed)),
        );
    });
}

export function buildSqlSummary(sql: string, maxLength = 48): string {
    const normalized = sql.replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, maxLength)}...`;
}

export function getRuleRankInField(
    rules: ParamFieldRule[],
    field: string,
    ruleId: string,
): number | undefined {
    const fieldRules = rules.filter(
        (rule) => rule.enabled !== false && ruleAppliesToField(rule, field),
    );
    const sorted = sortRulesForDisplay(fieldRules);
    const index = sorted.findIndex((rule) => rule.id === ruleId);
    return index >= 0 ? index + 1 : undefined;
}

export function explainRuleMatchReasons(
    rule: ParamFieldRule,
    contextParams: Record<string, string>,
): string[] {
    const deps = getRuleDependencyKeys(rule);
    if (deps.length === 0) {
        return ['全局默认规则（无依赖入参）'];
    }
    return deps.map((dep) =>
        paramValueExists(contextParams, dep) ? `依赖 ${dep} 已填写` : `依赖 ${dep} 未填写`,
    );
}

export function filterRulesByFieldSearch(
    rules: ParamFieldRule[],
    keyword: string,
): ParamFieldRule[] {
    const trimmed = keyword.trim().toLowerCase();
    if (!trimmed) return rules;
    const groups = filterFieldGroups(groupRulesByField(rules), keyword);
    const matchedIds = new Set(groups.flatMap((group) => group.rules.map((rule) => rule.id)));
    return rules.filter((rule) => matchedIds.has(rule.id));
}

export type FieldHealth = 'ok' | 'no-enabled' | 'no-fallback';

export function summarizeFieldHealth(rules: ParamFieldRule[]): FieldHealth {
    const summary = summarizeFieldGroup(rules);
    if (summary.enabled === 0) return 'no-enabled';
    if (!summary.hasFallback) return 'no-fallback';
    return 'ok';
}

export function formatRuleResolutionTooltip(rule: ParamFieldRule, rank: number): string {
    const deps = getRuleDependencyKeys(rule);
    const lines = [
        `当前顺位：#${rank}`,
        '',
        '排序依据：',
        deps.length > 0 ? `· 依赖入参 ${deps.length} 项` : '· 全局默认',
        (rule.priority ?? 0) > 0 ? `· priority = ${rule.priority}` : '',
        '',
        '全局规则：',
        '1. 依赖入参越多越优先',
        '2. SQL 必填占位符越多越优先',
        '3. priority 越大越优先',
        '4. id 字母序',
    ].filter(Boolean);
    return lines.join('\n');
}
