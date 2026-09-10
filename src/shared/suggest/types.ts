/** 入参智能提示规则与 DB 查询契约（渲染进程 / Electron 主进程 / IPC 共用） */
export interface DbConnectionConfig {
    server: string;
    port?: number;
    database: string;
    user: string;
    password: string;
    queryTimeoutMs?: number;
    maxRows?: number;
}

export type ParamSuggestBinding =
    | { type: 'param'; name: string }
    | { type: 'literal'; value: string | number };

export interface ParamRuleMatch {
    /** 要求已填写的入参名；仅判断是否存在非空值，不比较具体取值 */
    when?: Record<string, string>;
}

export interface SqlDatasource {
    type: 'sql';
    db: 'mssql';
    sql: string;
    bindings?: Record<string, ParamSuggestBinding>;
    /** @deprecated 固定使用列别名 value / remark，无需配置 */
    valueColumn?: string;
    /** @deprecated 固定使用列别名 value / remark，无需配置 */
    labelColumn?: string;
    cache?: { enabled: boolean; ttlSeconds: number };
    trigger?: 'focus' | 'typing';
}

export interface ParamFieldRule {
    id: string;
    /** 主字段名（兼容旧配置）；多字段时取第一个 */
    field: string;
    /** 适用字段列表；未配置时等同于 [field] */
    fields?: string[];
    type: 'select';
    enabled?: boolean;
    /** 同匹配精度下，数值越大越优先 */
    priority?: number;
    match?: ParamRuleMatch;
    datasource: SqlDatasource;
}

export interface ParamSuggestRulesFile {
    rules: ParamFieldRule[];
}

export interface DbSuggestRequest {
    field: string;
    contextParams: Record<string, string>;
    keyword?: string;
    /** 测试草稿规则时直跑 SQL，跳过规则解析与缓存 */
    ruleOverride?: ParamFieldRule;
    /** 多字段规则测试时指定适用字段 */
    testField?: string;
    databaseConfig?: DbConnectionConfig;
}

export interface DbSuggestOption {
    value: string;
    label: string;
}

export interface DbSuggestResponse {
    options: DbSuggestOption[];
    pendingDeps?: string[];
    fromCache?: boolean;
    error?: string;
    /** 查询成功但无下拉选项（0 行或可继续尝试下一条规则） */
    emptyResult?: boolean;
    /** 最终命中的规则 id（多规则顺序尝试时） */
    matchedRuleId?: string;
    /** 实际发送到数据库的 SQL（已处理可选占位符） */
    executedSql?: string;
    /** 绑定的查询参数 */
    boundParams?: Record<string, string | number>;
    /** 本次请求耗时（毫秒） */
    elapsedMs?: number;
}

export interface DbTestConnectionResult {
    ok: boolean;
    error?: string;
}

export interface DbScriptQueryRequest {
    sql: string;
    params?: Record<string, string | number>;
    databaseConfig?: DbConnectionConfig;
}

export interface DbScriptQueryResponse {
    rows: Record<string, unknown>[];
    columns: string[];
    error?: string;
    elapsedMs?: number;
}
