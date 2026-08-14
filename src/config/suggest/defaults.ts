import type { DbConnectionConfig, ParamSuggestRulesFile } from '@/shared/suggest/types';

export const DEFAULT_DB_CONFIG: DbConnectionConfig = {
    server: '127.0.0.1',
    port: 1433,
    database: '',
    user: '',
    password: '',
    options: {
        encrypt: false,
        trustServerCertificate: true,
    },
    queryTimeoutMs: 10000,
    maxRows: 500,
};

export const DEFAULT_PARAM_SUGGEST_RULES: ParamSuggestRulesFile = {
    rules: [],
};
