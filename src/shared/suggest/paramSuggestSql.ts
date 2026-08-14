/** 入参提示 SQL 解析：占位符提取、绑定、校验与结果映射（渲染/Electron 共用） */
import type { ParamSuggestBinding } from './types';
import { SUGGEST_REMARK_COLUMN, SUGGEST_VALUE_COLUMN } from './constants';

const OPTIONAL_MARK = '[?？]';
const PLACEHOLDER_RE = new RegExp(`@([a-zA-Z_][a-zA-Z0-9_]*)(${OPTIONAL_MARK})?`, 'g');

const FORBIDDEN_SQL_RE =
    /;|\b(insert|update|delete|drop|alter|create|truncate|exec|execute|merge|grant|revoke)\b/i;

export interface SqlPlaceholderDef {
    name: string;
    optional: boolean;
}

export function extractSqlPlaceholderDefs(sql: string): SqlPlaceholderDef[] {
    const found = new Map<string, boolean>();
    for (const match of sql.matchAll(PLACEHOLDER_RE)) {
        const name = match[1];
        const optional = match[2] === '?';
        const existing = found.get(name);
        if (existing === undefined) {
            found.set(name, optional);
        } else if (!optional) {
            found.set(name, false);
        }
    }
    return [...found.entries()].map(([name, optional]) => ({ name, optional }));
}

export function extractSqlPlaceholders(sql: string): string[] {
    return extractSqlPlaceholderDefs(sql).map((item) => item.name);
}

export function formatSqlPlaceholderToken(def: SqlPlaceholderDef): string {
    return def.optional ? `@${def.name}?` : `@${def.name}`;
}

export function formatSqlPlaceholderSummary(sql: string): string {
    const defs = extractSqlPlaceholderDefs(sql);
    if (defs.length === 0) return '无';
    const required = defs
        .filter((item) => !item.optional)
        .map((item) => formatSqlPlaceholderToken(item));
    const optional = defs
        .filter((item) => item.optional)
        .map((item) => formatSqlPlaceholderToken(item));
    const parts: string[] = [];
    if (required.length > 0) parts.push(`必填 ${required.join(', ')}`);
    if (optional.length > 0) parts.push(`可选 ${optional.join(', ')}`);
    return parts.join('；');
}

export function summarizeSqlDependencies(sql: string): {
    required: string[];
    optional: string[];
} {
    const defs = extractSqlPlaceholderDefs(sql);
    return {
        required: defs.filter((item) => !item.optional).map((item) => item.name),
        optional: defs.filter((item) => item.optional).map((item) => item.name),
    };
}

const VALUE_ALIAS_RE = /\bvalue\s*=|\bas\s+value\b/i;
const REMARK_ALIAS_RE = /\bremark\s*=|\bas\s+remark\b/i;

export function analyzeSuggestSelectSql(sql: string): {
    structure: { ok: true } | { ok: false; reason: string };
    hasValueAlias: boolean;
    hasRemarkAlias: boolean;
} {
    const structure = validateSelectSql(sql);
    const stripped = sql
        .replace(/--[^\n]*/g, ' ')
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .trim();
    return {
        structure,
        hasValueAlias: VALUE_ALIAS_RE.test(stripped),
        hasRemarkAlias: REMARK_ALIAS_RE.test(stripped),
    };
}

export function validateSelectSql(sql: string): { ok: true } | { ok: false; reason: string } {
    const stripped = sql
        .replace(/--[^\n]*/g, ' ')
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .trim();

    if (!stripped) {
        return { ok: false, reason: 'SQL 不能为空' };
    }

    if (!/^select\s/i.test(stripped)) {
        return { ok: false, reason: '仅允许 SELECT 查询' };
    }

    if (FORBIDDEN_SQL_RE.test(stripped)) {
        return { ok: false, reason: 'SQL 包含不允许的关键字' };
    }

    const whereMatches = stripped.match(/\bwhere\b/gi);
    if (whereMatches && whereMatches.length > 1) {
        return {
            ok: false,
            reason: 'SQL 包含多个 WHERE，请检查是否将 FROM 误写为 WHERE',
        };
    }

    if (/\bwhere\b/i.test(stripped) && !/\bfrom\b/i.test(stripped)) {
        return {
            ok: false,
            reason: 'SQL 含有 WHERE 但缺少 FROM，表名前应使用 FROM 而非 WHERE',
        };
    }

    return { ok: true };
}

export function findParamValue(
    contextParams: Record<string, string>,
    name: string,
): string | undefined {
    const target = name.toLowerCase();
    for (const [key, value] of Object.entries(contextParams)) {
        if (key.toLowerCase() === target) {
            return value;
        }
    }
    return undefined;
}

export function paramValueExists(contextParams: Record<string, string>, name: string): boolean {
    const value = findParamValue(contextParams, name);
    return value !== undefined && value.trim() !== '';
}

export interface ResolvedBindings {
    values: Record<string, string | number>;
    pendingDeps: string[];
    /** 可选占位符未填写，对应 where/and 条件应从 SQL 中剥离 */
    optionalEmpty: string[];
}

export function resolveSqlBindings(
    placeholders: SqlPlaceholderDef[],
    bindings: Record<string, ParamSuggestBinding> | undefined,
    contextParams: Record<string, string>,
): ResolvedBindings {
    const values: Record<string, string | number> = {};
    const pendingDeps: string[] = [];
    const optionalEmpty: string[] = [];

    for (const { name: placeholder, optional } of placeholders) {
        const binding = bindings?.[placeholder];
        let resolved: string | number | null = null;

        if (binding?.type === 'literal') {
            resolved = binding.value;
        } else if (binding?.type === 'param') {
            const paramValue = findParamValue(contextParams, binding.name);
            resolved = paramValue ?? null;
            if (resolved === null || String(resolved).trim() === '') {
                if (optional) {
                    optionalEmpty.push(placeholder);
                    continue;
                }
                pendingDeps.push(binding.name);
                continue;
            }
        } else {
            const paramValue = findParamValue(contextParams, placeholder);
            resolved = paramValue ?? null;
            if (resolved === null || String(resolved).trim() === '') {
                if (optional) {
                    optionalEmpty.push(placeholder);
                    continue;
                }
                pendingDeps.push(placeholder);
                continue;
            }
        }

        values[placeholder] = resolved;
    }

    return { values, pendingDeps, optionalEmpty };
}

function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripOptionalCondition(sql: string, name: string): string {
    const token = `@${escapeRegExp(name)}[?？]`;
    const predicate = `[\\w.]+\\s*=\\s*${token}`;
    return sql
        .replace(new RegExp(`\\s+and\\s+${predicate}`, 'gi'), ' ')
        .replace(new RegExp(`\\bwhere\\s+${predicate}`, 'gi'), ' ');
}

function normalizeWhereClause(sql: string): string {
    let result = sql.replace(/\bwhere\s+and\b/gi, 'where');
    if (!/\bwhere\b/i.test(result) && /\band\b/i.test(result)) {
        result = result.replace(/\band\b/i, 'where');
    }
    result = result.replace(/\bwhere\s+(?=(group\s+by|order\s+by|having\b))/gi, '');
    result = result.replace(/\bwhere\s*$/i, '');
    return result.replace(/\s{2,}/g, ' ').trim();
}

/** 去掉未填写的可选占位符条件，并将 @name? 规范为 @name */
export function prepareSuggestSql(sql: string, optionalEmpty: string[]): string {
    let result = sql;
    for (const name of optionalEmpty) {
        result = stripOptionalCondition(result, name);
    }
    result = normalizeWhereClause(result);
    result = result.replace(/@([a-zA-Z_][a-zA-Z0-9_]*)\?/g, '@$1');
    return result.trim();
}

export function formatExecutedSqlPreview(
    sql: string,
    boundParams?: Record<string, string | number>,
): string {
    const entries = Object.entries(boundParams ?? {});
    if (entries.length === 0) {
        return sql;
    }
    const paramText = entries
        .map(([key, value]) => `@${key} = ${JSON.stringify(value)}`)
        .join(', ');
    return `${sql}\n-- 参数: ${paramText}`;
}

export function formatSqlPreview(sql: string): string {
    const normalized = sql.replace(/\s+/g, ' ').trim();
    if (!normalized) return '';
    const withBreaks = normalized.replace(
        /\s+(?=(?:from|where|and|or|group by|order by|having)\b)/gi,
        '\n',
    );
    const lines = withBreaks.split('\n');
    return lines
        .map((line, index) => {
            const trimmed = line.trim();
            if (index === 0) return trimmed;
            if (/^(and|or)\b/i.test(trimmed)) return `  ${trimmed}`;
            return trimmed;
        })
        .join('\n');
}

export function buildSuggestCacheKey(
    field: string,
    resolvedValues: Record<string, string | number>,
): string {
    const parts = Object.keys(resolvedValues)
        .sort()
        .map((key) => `${key}=${String(resolvedValues[key])}`);
    return `${field.toLowerCase()}|${parts.join('&')}`;
}

function resolveColumnKey(row: Record<string, unknown>, columnName: string): string | undefined {
    if (columnName in row) return columnName;
    const target = columnName.toLowerCase();
    return Object.keys(row).find((key) => key.toLowerCase() === target);
}

export function formatSuggestDisplayLabel(value: string, remark: string): string {
    const trimmedValue = value.trim();
    const trimmedRemark = remark.trim();
    if (!trimmedRemark) return trimmedValue;
    if (trimmedRemark === trimmedValue) return trimmedValue;
    if (trimmedRemark.startsWith(`${trimmedValue}-`)) return trimmedRemark;
    return `${trimmedValue}-${trimmedRemark}`;
}

export function mapRowsToOptions(
    rows: Record<string, unknown>[],
): { value: string; label: string }[] {
    return rows
        .map((row) => {
            const resolvedValueKey = resolveColumnKey(row, SUGGEST_VALUE_COLUMN);
            const resolvedRemarkKey = resolveColumnKey(row, SUGGEST_REMARK_COLUMN);
            if (!resolvedValueKey) return null;

            const rawValue = row[resolvedValueKey];
            if (rawValue == null) return null;

            const value = String(rawValue).trim();
            const rawRemark = resolvedRemarkKey ? row[resolvedRemarkKey] : undefined;
            const remark =
                rawRemark != null && String(rawRemark).trim() !== ''
                    ? String(rawRemark).trim()
                    : '';
            const label = formatSuggestDisplayLabel(value, remark);

            return { value, label };
        })
        .filter((item): item is { value: string; label: string } => item !== null);
}

export function describeColumnMappingIssue(rows: Record<string, unknown>[]): string | undefined {
    if (rows.length === 0) return undefined;

    const sample = rows[0];
    const availableColumns = Object.keys(sample);

    const hasValueColumn = availableColumns.some(
        (column) => column.toLowerCase() === SUGGEST_VALUE_COLUMN,
    );
    if (!hasValueColumn) {
        return `查询结果缺少固定列 "${SUGGEST_VALUE_COLUMN}"，实际列为: ${availableColumns.join(', ')}。请使用 SELECT value = ...`;
    }

    const valueKey =
        availableColumns.find((column) => column.toLowerCase() === SUGGEST_VALUE_COLUMN) ??
        SUGGEST_VALUE_COLUMN;
    if (sample[valueKey] == null) {
        return `固定列 "${SUGGEST_VALUE_COLUMN}" 在结果中均为空值`;
    }

    return undefined;
}

export function filterOptionsByKeyword(
    options: { value: string; label: string }[],
    keyword: string | undefined,
): { value: string; label: string }[] {
    const trimmed = keyword?.trim().toLowerCase();
    if (!trimmed) return options;
    return options.filter(
        (item) =>
            item.value.toLowerCase().includes(trimmed) ||
            item.label.toLowerCase().includes(trimmed),
    );
}
