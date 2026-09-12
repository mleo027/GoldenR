export type KcxpProtocol = 'KCBP' | 'KGBP' | 'KUAB';
export type KcxpEnvironmentType = 'development' | 'test' | 'uat' | 'production';
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
    /** 当前环境专属 SQL Server 连接配置。 */
    database?: DbConnectionConfig;
    /** 自动化写库安全分级；未设置时保持只读。 */
    environmentType?: KcxpEnvironmentType;
    /** 仅非生产环境可开启，主进程会再次校验。 */
    allowAutomationSqlWrite?: boolean;
}
