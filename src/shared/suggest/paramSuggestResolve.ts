/**
 * 入参智能提示规则解析与排序（纯函数，渲染进程与主进程共用）。
 * 排序优先级：match.when 条数 + SQL 必填占位符 → priority → id。
 */
import type { ParamFieldRule, ParamRuleMatch } from './types';
import { extractSqlPlaceholderDefs, paramValueExists, resolveSqlBindings } from './paramSuggestSql';

export interface SuggestResolveContext {
    field: string;
    contextParams: Record<string, string>;
}

export function createRuleId(): string {
    return `rule-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function parseRuleFields(text: string): string[] {
    const fields = text
        .split(/[,;\n]/)
        .map((item) => item.trim())
        .filter(Boolean);
    const seen = new Set<string>();
    return fields.filter((item) => {
        const key = item.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export function getRuleFields(rule: ParamFieldRule): string[] {
    const fromArray = rule.fields?.map((item) => item.trim()).filter(Boolean) ?? [];
    if (fromArray.length > 0) return fromArray;
    return parseRuleFields(rule.field);
}

export function formatRuleFields(rule: ParamFieldRule): string {
    return getRuleFields(rule).join(', ');
}

export function ruleAppliesToField(rule: ParamFieldRule, field: string): boolean {
    const target = field.toLowerCase();
    return getRuleFields(rule).some((item) => item.toLowerCase() === target);
}

export function normalizeParamRuleMatch(match?: ParamRuleMatch): ParamRuleMatch | undefined {
    if (!match?.when || Object.keys(match.when).length === 0) return undefined;
    return { when: match.when };
}

export function normalizeParamFieldRule(rule: ParamFieldRule, index: number): ParamFieldRule {
    const fields = getRuleFields(rule);
    return {
        ...rule,
        id: rule.id?.trim() || `legacy-${fields[0] ?? rule.field}-${index}`,
        priority: rule.priority ?? 0,
        fields,
        field: fields[0] ?? rule.field,
        match: normalizeParamRuleMatch(rule.match),
    };
}

export function normalizeParamFieldRules(rules: ParamFieldRule[]): ParamFieldRule[] {
    return rules.map((rule, index) => normalizeParamFieldRule(rule, index));
}

export function countRuleRequiredSqlDeps(rule: ParamFieldRule): number {
    if (rule.datasource.type !== 'sql') return 0;
    return extractSqlPlaceholderDefs(rule.datasource.sql).filter((item) => !item.optional).length;
}

export function countRuleOptionalSqlDeps(rule: ParamFieldRule): number {
    if (rule.datasource.type !== 'sql') return 0;
    return extractSqlPlaceholderDefs(rule.datasource.sql).filter((item) => item.optional).length;
}

/** 必填占位符优先计分；仅含可选占位符时 +1，高于纯兜底 */
export function ruleSqlDepScore(rule: ParamFieldRule): number {
    const required = countRuleRequiredSqlDeps(rule);
    if (required > 0) return required * 2;
    return countRuleOptionalSqlDeps(rule) > 0 ? 1 : 0;
}

export function getRuleRequiredDepNames(rule: ParamFieldRule): string[] {
    if (rule.datasource.type !== 'sql') return [];
    return getSqlRequiredDepNames(rule.datasource.sql);
}

export function getRuleDependencyKeys(rule: ParamFieldRule): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    const add = (name: string) => {
        const key = name.toLowerCase();
        if (!key || seen.has(key)) return;
        seen.add(key);
        result.push(name);
    };
    for (const name of getRuleRequiredDepNames(rule)) {
        add(name);
    }
    for (const name of Object.keys(rule.match?.when ?? {})) {
        add(name);
    }
    return result;
}

export function getSqlRequiredDepNames(sql: string): string[] {
    return extractSqlPlaceholderDefs(sql)
        .filter((item) => !item.optional)
        .map((item) => item.name);
}

export function deriveMatchWhenFromSqlChange(
    sql: string,
    currentMatchWhenText: string,
    previousSqlDeps: string[],
): string {
    const currentKeys = Object.keys(parseWhenConditions(currentMatchWhenText) ?? {});
    const lastSqlSet = new Set(previousSqlDeps.map((key) => key.toLowerCase()));
    const manualExtras = currentKeys.filter((key) => !lastSqlSet.has(key.toLowerCase()));
    return mergeMatchWhenWithSqlDeps(sql, manualExtras.join(', '));
}

export function mergeMatchWhenWithSqlDeps(sql: string, matchWhenText?: string): string {
    const seen = new Set<string>();
    const merged: string[] = [];
    const add = (name: string) => {
        const trimmed = name.trim();
        const key = trimmed.toLowerCase();
        if (!trimmed || seen.has(key)) return;
        seen.add(key);
        merged.push(trimmed);
    };
    for (const { name, optional } of extractSqlPlaceholderDefs(sql)) {
        if (!optional) add(name);
    }
    for (const name of Object.keys(parseWhenConditions(matchWhenText ?? '') ?? {})) {
        add(name);
    }
    return merged.join(', ');
}

/** 仅校验必填占位符（@name）；可选占位符（英文 @name?）缺失时不跳过规则 */
export function ruleSqlDepsSatisfied(
    rule: ParamFieldRule,
    contextParams: Record<string, string>,
): boolean {
    if (rule.datasource.type !== 'sql') return true;
    const requiredPlaceholders = extractSqlPlaceholderDefs(rule.datasource.sql).filter(
        (item) => !item.optional,
    );
    if (requiredPlaceholders.length === 0) return true;
    const { pendingDeps } = resolveSqlBindings(
        requiredPlaceholders,
        rule.datasource.bindings,
        contextParams,
    );
    return pendingDeps.length === 0;
}

export function ruleSpecificity(rule: ParamFieldRule): number {
    const whenScore = rule.match?.when ? Object.keys(rule.match.when).length * 10 : 0;
    return whenScore + ruleSqlDepScore(rule);
}

export type RuleMatchTier = 'global' | 'when';

export function getRuleMatchTier(rule: ParamFieldRule): RuleMatchTier {
    return getRuleDependencyKeys(rule).length > 0 ? 'when' : 'global';
}

const RULE_TIER_LABELS: Record<RuleMatchTier, string> = {
    global: '全局默认',
    when: '依赖入参',
};

const RULE_TIER_COLORS: Record<RuleMatchTier, string> = {
    global: 'default',
    when: 'cyan',
};

export function formatRuleTierLabel(tier: RuleMatchTier): string {
    return RULE_TIER_LABELS[tier];
}

export function getRuleTierColor(tier: RuleMatchTier): string {
    return RULE_TIER_COLORS[tier];
}

/** 同匹配精度下数值越大越优先；精度相同时比较 priority，最后按 id 稳定排序 */
export function compareRulesForResolution(a: ParamFieldRule, b: ParamFieldRule): number {
    const specificityDiff = ruleSpecificity(b) - ruleSpecificity(a);
    if (specificityDiff !== 0) return specificityDiff;
    const priorityDiff = (b.priority ?? 0) - (a.priority ?? 0);
    if (priorityDiff !== 0) return priorityDiff;
    return a.id.localeCompare(b.id);
}

export function sortRulesForDisplay(rules: ParamFieldRule[]): ParamFieldRule[] {
    return [...rules].sort(compareRulesForResolution);
}

export function summarizeFieldGroup(rules: ParamFieldRule[]): {
    total: number;
    enabled: number;
    hasFallback: boolean;
} {
    const enabledRules = rules.filter((rule) => rule.enabled !== false);
    return {
        total: rules.length,
        enabled: enabledRules.length,
        hasFallback: enabledRules.some(
            (rule) => getRuleMatchTier(rule) === 'global' && countRuleRequiredSqlDeps(rule) === 0,
        ),
    };
}

/** 判断规则是否适用于当前字段与入参上下文（不含排序） */
export function ruleMatchesContext(rule: ParamFieldRule, context: SuggestResolveContext): boolean {
    if (rule.enabled === false) return false;
    if (!ruleAppliesToField(rule, context.field)) return false;

    const when = rule.match?.when;
    if (when) {
        for (const key of Object.keys(when)) {
            if (!paramValueExists(context.contextParams, key)) {
                return false;
            }
        }
    }

    return ruleSqlDepsSatisfied(rule, context.contextParams);
}

export function resolveSuggestRules(
    rules: ParamFieldRule[],
    context: SuggestResolveContext,
): ParamFieldRule[] {
    return sortRulesForDisplay(rules.filter((rule) => ruleMatchesContext(rule, context)));
}

export function resolveSuggestRule(
    rules: ParamFieldRule[],
    context: SuggestResolveContext,
): ParamFieldRule | undefined {
    return resolveSuggestRules(rules, context)[0];
}

export function hasSuggestRule(rules: ParamFieldRule[], context: SuggestResolveContext): boolean {
    return resolveSuggestRule(rules, context) !== undefined;
}

/** 字段是否配置了任意启用规则（不依赖上下文，用于稳定挂载输入组件） */
export function fieldHasSuggestRules(rules: ParamFieldRule[], field: string): boolean {
    return rules.some((rule) => rule.enabled !== false && ruleAppliesToField(rule, field));
}

export function formatRuleMatchSummary(rule: ParamFieldRule): string[] {
    const keys = getRuleDependencyKeys(rule);
    if (keys.length === 0) return ['全局默认'];
    return keys.map((key) => `需已填 ${key}`);
}

/** 可读的一条规则摘要，用于测试命中提示 */
export function formatRuleBriefLabel(rule: ParamFieldRule): string {
    const parts = [`字段 ${formatRuleFields(rule)}`, ...formatRuleMatchSummary(rule)];
    if ((rule.priority ?? 0) > 0) {
        parts.push(`优先级 ${rule.priority}`);
    }
    return parts.join(' · ');
}

export function formatRuleSqlPreview(rule: ParamFieldRule, maxLength = 96): string {
    const sql = rule.datasource.sql.replace(/\s+/g, ' ').trim();
    if (sql.length <= maxLength) return sql;
    return `${sql.slice(0, maxLength)}…`;
}

export function formatMatchedRuleHint(rule: ParamFieldRule): string {
    return `${formatRuleBriefLabel(rule)}\n配置 SQL: ${formatRuleSqlPreview(rule, 120)}`;
}

export function parseWhenConditions(text: string): Record<string, string> | undefined {
    const result: Record<string, string> = {};
    for (const pair of text.split(/[,;\n]/)) {
        const trimmed = pair.trim();
        if (!trimmed) continue;
        const separatorIndex = trimmed.indexOf('=');
        const key = separatorIndex > 0 ? trimmed.slice(0, separatorIndex).trim() : trimmed;
        if (key) result[key] = '';
    }
    return Object.keys(result).length > 0 ? result : undefined;
}

export function stringifyWhenConditions(when?: Record<string, string>): string {
    if (!when) return '';
    return Object.keys(when).join(', ');
}

export interface RuleFieldGroup {
    field: string;
    rules: ParamFieldRule[];
}

export function getRuleGroupKey(rule: ParamFieldRule): string {
    const fields = getRuleFields(rule);
    if (fields.length <= 1) {
        return fields[0]?.toLowerCase() ?? rule.id.toLowerCase();
    }
    return fields
        .map((item) => item.toLowerCase())
        .sort()
        .join('|');
}

export function groupRulesByField(rules: ParamFieldRule[]): RuleFieldGroup[] {
    const map = new Map<string, { label: string; rules: ParamFieldRule[] }>();

    for (const rule of rules) {
        const key = getRuleGroupKey(rule);
        const label = formatRuleFields(rule);
        const bucket = map.get(key);
        if (bucket) {
            if (!bucket.rules.some((item) => item.id === rule.id)) {
                bucket.rules.push(rule);
            }
        } else {
            map.set(key, { label, rules: [rule] });
        }
    }

    return [...map.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, group]) => ({
            field: group.label,
            rules: sortRulesForDisplay(group.rules),
        }));
}
