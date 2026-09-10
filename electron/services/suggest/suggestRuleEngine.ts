/** 入参智能提示 Electron 主进程：规则加载、SQL 执行、多规则 fallback 与缓存 */
import fsSync from 'node:fs';
import path from 'node:path';
import type {
    DbConnectionConfig,
    DbScriptQueryRequest,
    DbScriptQueryResponse,
    DbSuggestOption,
    DbSuggestRequest,
    DbSuggestResponse,
    ParamFieldRule,
    ParamSuggestRulesFile,
    SqlDatasource,
} from '../../../src/shared/suggest/types';
import {
    buildSuggestCacheKey,
    describeColumnMappingIssue,
    extractSqlPlaceholderDefs,
    filterOptionsByKeyword,
    mapRowsToOptions,
    prepareSuggestSql,
    resolveSqlBindings,
    validateSelectSql,
} from '../../../src/shared/suggest/paramSuggestSql';
import { executeSelect, testConnection } from './mssqlClient';
import { suggestCache } from './suggestCache';
import {
    resolveSuggestRules,
    ruleAppliesToField,
} from '../../../src/shared/suggest/paramSuggestResolve';
import {
    finalizeEmptySuggestResponse,
    shouldFallbackToNextSuggestRule,
} from '../../../src/shared/suggest/suggestRuleFallback';
import type { ConfigRepository } from '../../database/repositories/configRepository';

let rules: ParamFieldRule[] = [];
let legacyDbConfig: DbConnectionConfig | null = null;
let repository: ConfigRepository | null = null;

export function setSuggestRepository(next: ConfigRepository): void {
    repository = next;
}

/** @deprecated Runtime configuration is database-backed; kept for older test/integration callers. */
export function setSuggestAppRootDir(dir: string): void {
    legacyRoot = dir;
    repository = null;
}
let legacyRoot: string | null = null;

function isDbConnectionConfig(value: unknown): value is DbConnectionConfig {
    if (!value || typeof value !== 'object') return false;
    const config = value as Partial<DbConnectionConfig>;
    return (
        typeof config.server === 'string' &&
        typeof config.database === 'string' &&
        typeof config.user === 'string' &&
        typeof config.password === 'string'
    );
}

export async function reloadSuggestConfig(): Promise<void> {
    const readLegacy = (name: string): unknown | null => {
        if (!legacyRoot) return null;
        try {
            return JSON.parse(fsSync.readFileSync(path.join(legacyRoot, name), 'utf8'));
        } catch {
            return null;
        }
    };
    legacyDbConfig = isDbConnectionConfig(readLegacy('db.json'))
        ? (readLegacy('db.json') as DbConnectionConfig)
        : null;
    const parsed = (repository?.read('param-suggest-rules.json') ??
        readLegacy('param-suggest-rules.json')) as ParamSuggestRulesFile | null;
    rules = Array.isArray(parsed?.rules) ? parsed.rules : [];

    suggestCache.invalidate();
}

export function getLoadedRules(): ParamFieldRule[] {
    return rules;
}

export async function testDbConnection(
    config: DbConnectionConfig,
): Promise<{ ok: boolean; error?: string }> {
    return testConnection(config);
}

interface SuggestExecutionMeta {
    executedSql: string;
    boundParams: Record<string, string | number>;
}

type PreparedSuggestSql =
    | { meta: SuggestExecutionMeta; pendingDeps: string[] }
    | { error: string; meta: SuggestExecutionMeta };

function prepareSuggestSqlRun(
    datasource: SqlDatasource,
    request: DbSuggestRequest,
): PreparedSuggestSql {
    const validation = validateSelectSql(datasource.sql);
    if (!validation.ok) {
        return { error: validation.reason, meta: { executedSql: datasource.sql, boundParams: {} } };
    }

    const placeholderDefs = extractSqlPlaceholderDefs(datasource.sql);
    const { values, pendingDeps, optionalEmpty } = resolveSqlBindings(
        placeholderDefs,
        datasource.bindings,
        request.contextParams,
    );

    const sqlToRun = prepareSuggestSql(datasource.sql, optionalEmpty);
    const meta = { executedSql: sqlToRun, boundParams: values };

    if (pendingDeps.length > 0) {
        return { meta, pendingDeps };
    }

    const runtimeValidation = validateSelectSql(sqlToRun);
    if (!runtimeValidation.ok) {
        return { error: runtimeValidation.reason, meta };
    }

    return { meta, pendingDeps: [] };
}

function toCachedSuggestResponse(
    cached: DbSuggestOption[],
    keyword: string | undefined,
    meta: SuggestExecutionMeta,
): DbSuggestResponse {
    return {
        options: filterOptionsByKeyword(cached, keyword),
        fromCache: true,
        ...meta,
    };
}

async function executeSuggestQuery(
    dbConfig: DbConnectionConfig,
    meta: SuggestExecutionMeta,
    keyword: string | undefined,
    cacheEnabled: boolean,
    cacheKey: string,
    ttlSeconds: number,
): Promise<DbSuggestResponse> {
    if (!dbConfig) {
        return { options: [], error: '未配置数据库连接 (db.json)', ...meta };
    }

    try {
        const { rows } = await executeSelect(
            dbConfig,
            meta.executedSql,
            meta.boundParams,
            dbConfig.maxRows,
        );
        const options = mapRowsToOptions(rows);

        if (options.length === 0 && rows.length > 0) {
            const mappingError = describeColumnMappingIssue(rows);
            return {
                options: [],
                error: mappingError ?? `查询返回 ${rows.length} 行，但未能映射为下拉选项`,
                ...meta,
            };
        }

        if (options.length === 0) {
            return {
                options: [],
                emptyResult: true,
                ...meta,
            };
        }

        if (cacheEnabled) {
            suggestCache.set(cacheKey, options, ttlSeconds);
        }

        return {
            options: filterOptionsByKeyword(options, keyword),
            ...meta,
        };
    } catch (error) {
        return {
            options: [],
            error: error instanceof Error ? error.message : String(error),
            ...meta,
        };
    }
}

async function runSuggestSql(
    request: DbSuggestRequest,
    rule: ParamFieldRule,
    skipCache: boolean,
    dbConfig: DbConnectionConfig,
): Promise<DbSuggestResponse> {
    const datasource = rule.datasource;
    if (datasource.type !== 'sql' || datasource.db !== 'mssql') {
        return { options: [], error: '不支持的数据源类型' };
    }

    const prepared = prepareSuggestSqlRun(datasource, request);
    if ('error' in prepared) {
        return { options: [], error: prepared.error, ...prepared.meta };
    }
    if (prepared.pendingDeps.length > 0) {
        return { options: [], pendingDeps: prepared.pendingDeps, ...prepared.meta };
    }

    const { meta } = prepared;
    const cacheEnabled = !skipCache && datasource.cache?.enabled !== false;
    const ttlSeconds = datasource.cache?.ttlSeconds ?? 300;
    const cacheKey = buildSuggestCacheKey(request.field, meta.boundParams);

    if (cacheEnabled) {
        const cached = suggestCache.get(cacheKey);
        if (cached) {
            return toCachedSuggestResponse(cached, request.keyword, meta);
        }
    }

    return executeSuggestQuery(dbConfig, meta, request.keyword, cacheEnabled, cacheKey, ttlSeconds);
}

export async function executeSuggest(request: DbSuggestRequest): Promise<DbSuggestResponse> {
    const startedAt = Date.now();
    const withTiming = (response: DbSuggestResponse): DbSuggestResponse => ({
        ...response,
        elapsedMs: Date.now() - startedAt,
    });

    const dbConfig = request.databaseConfig ?? legacyDbConfig;
    if (!dbConfig || !isDbConnectionConfig(dbConfig)) {
        return withTiming({ options: [], error: '当前环境数据库配置不完整' });
    }

    if (request.ruleOverride) {
        const testField = request.testField?.trim() || request.field;
        if (!ruleAppliesToField(request.ruleOverride, testField)) {
            return withTiming({
                options: [],
                error: `规则不适用于字段 "${testField}"`,
            });
        }
        return withTiming(await runSuggestSql(request, request.ruleOverride, true, dbConfig));
    }

    const matchedRules = resolveSuggestRules(rules, {
        field: request.field,
        contextParams: request.contextParams,
    });
    if (matchedRules.length === 0) {
        return withTiming({
            options: [],
            error: `未找到字段 "${request.field}" 在当前场景下的启用规则，请检查依赖入参或提高规则优先级`,
        });
    }

    let lastResponse: DbSuggestResponse = { options: [] };
    // 按 resolveSuggestRules 排序依次尝试；当前规则 0 行且无 pendingDeps 时可 fallback 到下一条
    for (let index = 0; index < matchedRules.length; index += 1) {
        const rule = matchedRules[index];
        const response = await runSuggestSql(request, rule, false, dbConfig);
        lastResponse = response;

        if (response.options.length > 0) {
            return withTiming({ ...response, matchedRuleId: rule.id });
        }

        if (response.pendingDeps?.length) {
            return withTiming(response);
        }

        const hasNextRule = index < matchedRules.length - 1;
        if (shouldFallbackToNextSuggestRule(response) && hasNextRule) {
            continue;
        }

        return withTiming(
            finalizeEmptySuggestResponse({
                ...response,
                matchedRuleId: rule.id,
            }),
        );
    }

    return withTiming(finalizeEmptySuggestResponse(lastResponse));
}

export async function executeScriptQuery(
    request: DbScriptQueryRequest,
): Promise<DbScriptQueryResponse> {
    const dbConfig = request.databaseConfig ?? legacyDbConfig;
    if (!dbConfig || !isDbConnectionConfig(dbConfig)) {
        return { rows: [], columns: [], error: '当前环境数据库配置不完整' };
    }

    const validation = validateSelectSql(request.sql);
    if (!validation.ok) {
        return { rows: [], columns: [], error: validation.reason };
    }

    const placeholderDefs = extractSqlPlaceholderDefs(request.sql);
    const params = request.params ?? {};
    const optionalEmpty: string[] = [];
    const values: Record<string, string | number> = {};
    const missing: string[] = [];

    for (const def of placeholderDefs) {
        const raw = params[def.name];
        const text = raw == null ? '' : String(raw).trim();
        if (!text) {
            if (def.optional) {
                optionalEmpty.push(def.name);
            } else {
                missing.push(def.name);
            }
            continue;
        }
        values[def.name] = raw;
    }

    if (missing.length > 0) {
        return { rows: [], columns: [], error: `缺少 SQL 参数: ${missing.join(', ')}` };
    }

    const sqlToRun = prepareSuggestSql(request.sql, optionalEmpty);
    const runtimeValidation = validateSelectSql(sqlToRun);
    if (!runtimeValidation.ok) {
        return { rows: [], columns: [], error: runtimeValidation.reason };
    }

    try {
        const startedAt = Date.now();
        const { rows, columns } = await executeSelect(dbConfig, sqlToRun, values, dbConfig.maxRows);
        return {
            rows,
            columns,
            elapsedMs: Date.now() - startedAt,
        };
    } catch (error) {
        return {
            rows: [],
            columns: [],
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
