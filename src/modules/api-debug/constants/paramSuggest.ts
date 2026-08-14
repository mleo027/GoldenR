import type { DbConnectionConfig, ParamSuggestRulesFile } from '../types/paramSuggest';

export { DEFAULT_DB_CONFIG, DEFAULT_PARAM_SUGGEST_RULES } from '@/config/suggest/defaults';
export {
    DB_CONFIG_FILE,
    PARAM_SUGGEST_RULES_FILE,
    SUGGEST_VALUE_COLUMN,
    SUGGEST_REMARK_COLUMN,
} from '@/shared/suggest/constants';

/** 规则 SQL 必须使用列别名 value（填充值）；remark（下拉展示）可选，有则组合为 value-remark */
export const SUGGEST_SQL_COLUMN_HINT =
    'SELECT 必须使用列别名 value（填充值）；remark（下拉展示）可选，有则组合为 value-remark';

export const SUGGEST_SQL_OPTIONAL_PLACEHOLDER_HINT =
    '占位符加英文 ? 表示可选，如 @orgid?：入参为空时规则仍可命中，执行时自动去掉对应 where/and 条件';

export type { DbConnectionConfig, ParamSuggestRulesFile };
