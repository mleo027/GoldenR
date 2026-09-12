/**
 * 运行日志条目类型。
 *
 * 从 store/runLogStore 抽出的纯类型，供 services 与 store 共享，
 * 避免 service 层为了引用一个类型而依赖 store 实现。
 */
export interface RunLogEntry {
    id: string;
    caseName: string;
    msgtype: string;
    success: boolean;
    timecost?: number;
    rows?: number;
    message: string;
    timestamp: number;
}
