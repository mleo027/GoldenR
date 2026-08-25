export interface KcbpConnectionOptions {
    ip?: string;
    port?: string;
    reqqueue?: string;
    ansqueue?: string;
    service?: string;
    apiid?: string;
    connecttimeout?: string;
    requesttimeout?: string;
}

export type KcbpTextFieldValue = string;

/** IPC 形态：二进制字段名 → 本地绝对路径；主进程 resolve 后写入 fields 为 Buffer */
export interface KcbpParamOptions {
    msgtype?: string;
    fields?: Record<string, KcbpTextFieldValue>;
    binaryFields?: Record<string, string>;
}

export interface KcbpRequestOptions {
    /** 协议类型：缺省 KCBP，向后兼容 */
    type?: 'KCBP' | 'KGBP';
    connection: KcbpConnectionOptions;
    param: KcbpParamOptions;
}

export interface KcbpResponseData {
    code: string;
    msg: string;
    data: unknown[];
    level?: string;
    stats: {
        timecost: number;
        rows: number;
    };
}

export interface KcbpRuntimeConfig {
    executable: string;
    workingDir: string;
    args: string[];
}

export interface KcbpPickPathResult {
    canceled: boolean;
    path?: string;
}
