export interface KcbpConnectionOptions {
    ip?: string;
    port?: string;
    reqqueue?: string;
    ansqueue?: string;
    service?: string;
    apiid?: string;
    requesttimeout?: string;
    kuabConfigId?: string;
    serverName?: string;
    username?: string;
    password?: string;
    configDir?: string;
    configName?: string;
    logDir?: string;
    wantTran?: string;
}

export type KcbpTextFieldValue = string;

/** IPC 形态：二进制字段名 → 本地绝对路径；主进程 resolve 后写入 fields 为 Buffer */
export interface KcbpParamOptions {
    msgtype?: string;
    fields?: Record<string, KcbpTextFieldValue>;
    binaryFields?: Record<string, string>;
    /** KGBP：网关服务名（native 读 param.servicename），缺省回落 msgtype */
    servicename?: string;
    /** KGBP：节点 ID（native 读 param.nodeid，整数） */
    nodeid?: number;
    /** KGBP：客户端会话 ID（native 读 param.clientsessionid，整数） */
    clientsessionid?: number;
}

export interface KcbpRequestOptions {
    /** 协议类型：缺省 KCBP，向后兼容 */
    type?: 'KCBP' | 'KGBP' | 'KUAB';
    connection: KcbpConnectionOptions;
    param: KcbpParamOptions;
}

export interface KcbpResponseData {
    code: string;
    msg: string;
    /** 恒为结果集数组（边界已归一化） */
    data: KcbpResultSet[];
    level?: string;
    stats: {
        timecost: number;
        rows: number;
    };
    trace?: SqlTraceResult;
}

export interface SqlTraceEvent {
    eventType: string;
    timestampUtc: string;
    sqlText: string;
    durationMs: number;
    sessionId: number;
    objectName?: string;
    errorMessage?: string;
}

export interface SqlTraceResult {
    enabled: boolean;
    session?: string;
    events: SqlTraceEvent[];
    startError?: string;
    readError?: string;
    stopError?: string;
}

export interface TraceExecutionOptions {
    enabled: boolean;
}

export interface KcbpResultSet {
    name: string;
    /** Native response column definitions, retained when a result set has no rows. */
    columns?: string[];
    rows: Record<string, unknown>[];
}

export interface KcbpRuntimeConfig {
    executable: string;
    workingDir: string;
    args: string[];
}

export interface KuabProfile {
    id: string;
    name: string;
    serverName: string;
    username: string;
    password: string;
    configDir?: string;
    configName?: string;
    logDir?: string;
    wantTran?: string;
}

export interface KcbpPickPathResult {
    canceled: boolean;
    path?: string;
}
