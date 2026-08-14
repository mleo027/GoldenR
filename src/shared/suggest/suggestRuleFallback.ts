/** 入参智能提示：多规则顺序尝试时的空结果与兜底判定 */
import type { DbSuggestResponse } from './types';

export const SUGGEST_EMPTY_RESULT_MESSAGE =
    '查询成功，但数据库返回 0 行。请检查 SQL、表数据或 WHERE 条件';

/** 当前规则 SQL 成功执行但无下拉数据时，可继续尝试下一条匹配规则 */
export function shouldFallbackToNextSuggestRule(response: DbSuggestResponse): boolean {
    if (response.options.length > 0) return false;
    if (response.pendingDeps?.length) return false;
    return response.emptyResult === true;
}

/** 查询成功但 0 行时，向 UI 返回可读提示（非 SQL 错误） */
export function finalizeEmptySuggestResponse(response: DbSuggestResponse): DbSuggestResponse {
    if (response.options.length > 0 || response.pendingDeps?.length) {
        return response;
    }
    if (response.error) {
        return response;
    }
    return {
        ...response,
        error: SUGGEST_EMPTY_RESULT_MESSAGE,
    };
}
