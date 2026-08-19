import type { DbConnectionConfig, ParamSuggestRulesFile } from './types';

export const DEFAULT_DB_CONFIG: DbConnectionConfig = {
    server: '127.0.0.1',
    port: 1433,
    database: '',
    user: '',
    password: '',
    queryTimeoutMs: 10000,
    maxRows: 500,
};

export const DEFAULT_PARAM_SUGGEST_RULES: ParamSuggestRulesFile = {
    rules: [],
};
