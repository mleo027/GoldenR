export type KcxpProtocol = 'KCBP' | 'KGBP' | 'KUAB';
import type { DbConnectionConfig } from '../suggest/types';

export interface KcxpEnvironment {
    id: string;
    name: string;
    host: string;
    queue: string;
    timeout: string;
    /** 协议类型：缺省 'KCBP' */
    protocol?: KcxpProtocol;
    /** KGBP 必填（表单层校验）：网关服务名，地位对等 KCBP 的 Queue */
    service?: string;
    /** KGBP 必填（表单层校验）：节点 ID */
    nodeId?: string;
    /** KGBP 可选：会话 ID */
    clientSessionId?: string;
    /** KUAB 运行时配置 profile。 */
    kuabConfigId?: string;
    /** 当前环境专属 SQL Server 连接配置。 */
    database?: DbConnectionConfig;
}
