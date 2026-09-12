/**
 * 请求历史 ID 生成（纯函数）。
 *
 * 从 store/requestHistoryData 抽出，供 store 与 services 共用，
 * 使 service 层无需依赖 store 实现即可写入历史记录。
 */
export function createRequestHistoryId(timestamp = Date.now()): string {
    return `${timestamp}-${Math.random().toString(36).slice(2, 10)}`;
}
