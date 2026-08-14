import type { ParamFieldRule, ParamSuggestBinding } from '../../types/paramSuggest';
import { extractSqlPlaceholderDefs } from './paramSuggestSql';
import {
    createRuleId,
    formatRuleFields,
    getSqlRequiredDepNames,
    parseRuleFields,
} from './paramSuggestResolve';

export type BindingMode = 'auto' | 'param' | 'literal';

export interface BindingFormRow {
    placeholder: string;
    mode: BindingMode;
    optional?: boolean;
    paramName?: string;
    literalValue?: string;
}

export interface RuleFormValues {
    field: string;
    sql: string;
    priority: number;
    enabled: boolean;
    cacheEnabled: boolean;
    cacheTtlSeconds: number;
    trigger: 'focus' | 'typing';
    bindings: BindingFormRow[];
}

export const EMPTY_RULE_FORM: RuleFormValues = {
    field: '',
    sql: '',
    priority: 0,
    enabled: true,
    cacheEnabled: true,
    cacheTtlSeconds: 300,
    trigger: 'focus',
    bindings: [],
};

export function normalizeBindingRows(rows: unknown): BindingFormRow[] {
    if (!Array.isArray(rows)) return [];
    return rows.filter(
        (row): row is BindingFormRow =>
            Boolean(row) &&
            typeof row === 'object' &&
            typeof (row as BindingFormRow).placeholder === 'string',
    );
}

export function resolveRuleFormValues(
    values: Partial<RuleFormValues>,
    fallbackBindings?: unknown,
): RuleFormValues {
    const bindings = normalizeBindingRows(values.bindings);
    const resolvedBindings =
        bindings.length > 0
            ? bindings
            : normalizeBindingRows(fallbackBindings).length > 0
              ? normalizeBindingRows(fallbackBindings)
              : buildBindingRows(values.sql ?? '');

    return {
        ...EMPTY_RULE_FORM,
        ...values,
        bindings: resolvedBindings,
    };
}

export function buildBindingRows(
    sql: string,
    existing?: Record<string, ParamSuggestBinding>,
): BindingFormRow[] {
    return extractSqlPlaceholderDefs(sql).map(({ name: placeholder, optional }) => {
        const binding = existing?.[placeholder];
        if (!binding) {
            return { placeholder, mode: 'auto' as const, optional };
        }
        if (binding.type === 'literal') {
            return {
                placeholder,
                mode: 'literal' as const,
                literalValue: String(binding.value),
                optional,
            };
        }
        if (binding.name.toLowerCase() === placeholder.toLowerCase()) {
            return { placeholder, mode: 'auto' as const, optional };
        }
        return { placeholder, mode: 'param' as const, paramName: binding.name, optional };
    });
}

export function bindingsToRecord(
    rows: BindingFormRow[] | unknown,
): Record<string, ParamSuggestBinding> | undefined {
    const result: Record<string, ParamSuggestBinding> = {};
    for (const row of normalizeBindingRows(rows)) {
        if (row.mode === 'literal') {
            const raw = row.literalValue?.trim() ?? '';
            if (!raw) continue;
            const num = Number(raw);
            result[row.placeholder] = {
                type: 'literal',
                value: Number.isNaN(num) ? raw : num,
            };
            continue;
        }
        if (row.mode === 'param') {
            const name = row.paramName?.trim();
            if (!name) continue;
            result[row.placeholder] = { type: 'param', name };
        }
    }
    return Object.keys(result).length > 0 ? result : undefined;
}

function buildMatchWhenFromSql(sql: string): Record<string, string> | undefined {
    const required = getSqlRequiredDepNames(sql);
    if (required.length === 0) return undefined;
    return Object.fromEntries(required.map((name) => [name, '']));
}

export function ruleToFormValues(rule: ParamFieldRule): RuleFormValues {
    const sql = rule.datasource.sql;
    return {
        field: formatRuleFields(rule),
        sql,
        priority: rule.priority ?? 0,
        enabled: rule.enabled !== false,
        cacheEnabled: rule.datasource.cache?.enabled !== false,
        cacheTtlSeconds: rule.datasource.cache?.ttlSeconds ?? 300,
        trigger: rule.datasource.trigger ?? 'focus',
        bindings: buildBindingRows(sql, rule.datasource.bindings),
    };
}

export function formValuesToRule(values: RuleFormValues, ruleId?: string): ParamFieldRule {
    const normalized = resolveRuleFormValues(values);
    const fields = parseRuleFields(normalized.field);
    const when = buildMatchWhenFromSql(normalized.sql);
    const match = when ? { when } : undefined;

    return {
        id: ruleId ?? createRuleId(),
        field: fields[0] ?? '',
        fields,
        type: 'select',
        enabled: normalized.enabled,
        priority: normalized.priority ?? 0,
        match,
        datasource: {
            type: 'sql',
            db: 'mssql',
            sql: normalized.sql.trim(),
            bindings: bindingsToRecord(normalized.bindings),
            cache: {
                enabled: normalized.cacheEnabled,
                ttlSeconds: normalized.cacheTtlSeconds,
            },
            trigger: normalized.trigger,
        },
    };
}

export function hasNonDefaultBindings(rows: BindingFormRow[] | unknown): boolean {
    return normalizeBindingRows(rows).some((row) => row.mode === 'param' || row.mode === 'literal');
}

export function parseContextParams(text: string): Record<string, string> {
    const contextParams: Record<string, string> = {};
    for (const pair of text.split(/[,;\n]/)) {
        const trimmed = pair.trim();
        if (!trimmed) continue;
        const separatorIndex = trimmed.indexOf('=');
        if (separatorIndex <= 0) continue;
        const key = trimmed.slice(0, separatorIndex).trim();
        const value = trimmed.slice(separatorIndex + 1).trim();
        if (key) contextParams[key] = value;
    }
    return contextParams;
}
