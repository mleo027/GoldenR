import type { ReactNode } from 'react';
import { Button, Radio, Switch, Tooltip } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { Input, Select } from '../../../../components/ui/primitives';
import type { KcxpEnvironment, KcxpEnvironmentType, KcxpProtocol } from '../../types/kcxp';
import { DEFAULT_KCBP_TIMEOUT } from '../../utils/kcbp/kcbpAddress';
import { DEFAULT_DB_CONFIG } from '../../constants/paramSuggest';

const PROTOCOL_SELECT_OPTIONS = [
    { value: 'KCBP', label: 'KCBP' },
    { value: 'KGBP', label: 'KGBP' },
    { value: 'KUAB', label: 'KUAB' },
];

const ENVIRONMENT_TYPE_OPTIONS = [
    { value: 'development', label: '开发' },
    { value: 'test', label: '测试' },
    { value: 'uat', label: 'UAT' },
    { value: 'production', label: '生产' },
];

/** 连接参数区字段：标签在控件上方，三列网格内等宽。 */
function EnvField({
    label,
    tip,
    fieldId,
    required,
    children,
}: {
    label: string;
    tip: string;
    fieldId: string;
    required?: boolean;
    children: ReactNode;
}) {
    return (
        <div className="kcxp-env-field">
            <Tooltip title={tip}>
                <label className="kcxp-env-field-label" htmlFor={fieldId}>
                    {label}
                    {required ? <span className="kcxp-env-field-required">*</span> : null}
                </label>
            </Tooltip>
            {children}
        </div>
    );
}

/** 数据库区字段：标签在控件左侧；成对网格保证跨行标签与控件左缘对齐。 */
function DbPair({
    label,
    tip,
    fieldId,
    children,
}: {
    label: string;
    tip: string;
    fieldId: string;
    children: ReactNode;
}) {
    return (
        <div className="kcxp-env-pair">
            <Tooltip title={tip}>
                <label className="kcxp-env-pair-label" htmlFor={fieldId}>
                    {label}
                </label>
            </Tooltip>
            {children}
        </div>
    );
}

export interface EnvironmentRowProps {
    environment: KcxpEnvironment;
    active: boolean;
    canDelete: boolean;
    onChange: (next: KcxpEnvironment) => void;
    onSelect: () => void;
    onDelete: () => void;
}

export default function EnvironmentRow({
    environment,
    active,
    canDelete,
    onChange,
    onSelect,
    onDelete,
}: EnvironmentRowProps) {
    const updateField = <K extends keyof KcxpEnvironment>(field: K, value: KcxpEnvironment[K]) => {
        onChange({ ...environment, [field]: value });
    };

    const isKGBP = (environment.protocol ?? 'KCBP') === 'KGBP';
    const database = environment.database ?? DEFAULT_DB_CONFIG;
    const fieldId = (suffix: string) => `${environment.id}-${suffix}`;

    return (
        <div className={`kcxp-env-row${active ? ' kcxp-env-row-active' : ''}`}>
            <div className="kcxp-env-row-header">
                <Radio checked={active} onChange={onSelect}>
                    <Input
                        value={environment.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        placeholder="环境名称"
                        size="sm"
                        className="kcxp-env-name-input"
                        onClick={(e) => e.stopPropagation()}
                    />
                </Radio>
                <div className="kcxp-env-row-actions">
                    <Select
                        value={environment.protocol ?? 'KCBP'}
                        options={PROTOCOL_SELECT_OPTIONS}
                        onChange={(value) => updateField('protocol', value as KcxpProtocol)}
                        size="sm"
                        variant="borderless"
                        aria-label="协议类型"
                    />
                    <Tooltip title="删除该环境">
                        <span className="inline-flex">
                            <Button
                                type="text"
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                disabled={!canDelete}
                                onClick={onDelete}
                                className="kcxp-env-delete"
                                aria-label="删除环境"
                            />
                        </span>
                    </Tooltip>
                </div>
            </div>

            <div className="kcxp-env-row-fields">
                <section className="kcxp-env-section">
                    <div className="kcxp-env-section-head">
                        <span className="kcxp-env-section-title">连接配置</span>
                    </div>
                    <div className="kcxp-env-field-grid">
                        <EnvField
                            label="Host"
                            tip="服务地址与端口，如 127.0.0.1:21000"
                            fieldId={fieldId('host')}
                        >
                            <Input
                                id={fieldId('host')}
                                value={environment.host}
                                onChange={(e) => updateField('host', e.target.value)}
                                placeholder="127.0.0.1:21000"
                                size="sm"
                            />
                        </EnvField>
                        {isKGBP ? (
                            <>
                                <EnvField
                                    label="ServiceName"
                                    tip="网关服务名（必填）"
                                    fieldId={fieldId('service')}
                                    required
                                >
                                    <Input
                                        id={fieldId('service')}
                                        value={environment.service ?? ''}
                                        onChange={(e) => updateField('service', e.target.value)}
                                        placeholder="网关服务名（必填）"
                                        size="sm"
                                        status={!environment.service?.trim() ? 'error' : undefined}
                                    />
                                </EnvField>
                                <EnvField
                                    label="NodeId"
                                    tip="节点 ID（必填）"
                                    fieldId={fieldId('nodeId')}
                                    required
                                >
                                    <Input
                                        id={fieldId('nodeId')}
                                        value={environment.nodeId ?? ''}
                                        onChange={(e) => updateField('nodeId', e.target.value)}
                                        placeholder="节点 ID（必填）"
                                        size="sm"
                                        status={!environment.nodeId?.trim() ? 'error' : undefined}
                                    />
                                </EnvField>
                                <EnvField
                                    label="ClientSessionId"
                                    tip="会话标识，可留空"
                                    fieldId={fieldId('clientSessionId')}
                                >
                                    <Input
                                        id={fieldId('clientSessionId')}
                                        value={environment.clientSessionId ?? ''}
                                        onChange={(e) =>
                                            updateField('clientSessionId', e.target.value)
                                        }
                                        placeholder="可选"
                                        size="sm"
                                    />
                                </EnvField>
                                <EnvField
                                    label="RequestTimeout"
                                    tip="请求超时时间（秒）"
                                    fieldId={fieldId('requestTimeout')}
                                >
                                    <Input
                                        id={fieldId('requestTimeout')}
                                        value={environment.timeout}
                                        onChange={(e) => updateField('timeout', e.target.value)}
                                        placeholder={DEFAULT_KCBP_TIMEOUT}
                                        size="sm"
                                    />
                                </EnvField>
                            </>
                        ) : (
                            <>
                                <EnvField
                                    label="Queue"
                                    tip="KCBP 请求队列名称，需与柜台配置一致"
                                    fieldId={fieldId('queue')}
                                >
                                    <Input
                                        id={fieldId('queue')}
                                        value={environment.queue}
                                        onChange={(e) => updateField('queue', e.target.value)}
                                        placeholder="req1"
                                        size="sm"
                                    />
                                </EnvField>
                                <EnvField
                                    label="Timeout"
                                    tip="请求超时时间（秒）"
                                    fieldId={fieldId('timeout')}
                                >
                                    <Input
                                        id={fieldId('timeout')}
                                        value={environment.timeout}
                                        onChange={(e) => updateField('timeout', e.target.value)}
                                        placeholder={DEFAULT_KCBP_TIMEOUT}
                                        size="sm"
                                    />
                                </EnvField>
                            </>
                        )}
                    </div>
                </section>

                <section className="kcxp-env-section kcxp-env-database-fields">
                    <div className="kcxp-env-section-head">
                        <span className="kcxp-env-section-title">数据库配置</span>
                        <div className="kcxp-env-section-head-actions">
                            {/* Select 自身拦鼠标事件，Tooltip 直接包它可能不弹；用 span 承接悬浮 */}
                            <Tooltip title="决定是否允许自动化写库；生产环境强制禁止写入">
                                <span className="inline-flex">
                                    <Select
                                        value={environment.environmentType}
                                        options={ENVIRONMENT_TYPE_OPTIONS}
                                        placeholder="环境类型（未设置时禁止写库）"
                                        size="sm"
                                        aria-label="环境类型"
                                        onChange={(value) => {
                                            const environmentType = value as KcxpEnvironmentType;
                                            onChange({
                                                ...environment,
                                                environmentType,
                                                allowAutomationSqlWrite:
                                                    environmentType === 'production'
                                                        ? false
                                                        : environment.allowAutomationSqlWrite,
                                            });
                                        }}
                                    />
                                </span>
                            </Tooltip>
                            <Tooltip title="仅在已设置非生产环境类型时可开启">
                                <label
                                    className="kcxp-env-write-toggle"
                                    htmlFor={fieldId('allow-write')}
                                >
                                    允许自动化 SQL 写入
                                    <Switch
                                        id={fieldId('allow-write')}
                                        size="small"
                                        checked={environment.allowAutomationSqlWrite === true}
                                        disabled={
                                            !environment.environmentType ||
                                            environment.environmentType === 'production'
                                        }
                                        onChange={(value) =>
                                            updateField('allowAutomationSqlWrite', value)
                                        }
                                    />
                                </label>
                            </Tooltip>
                        </div>
                    </div>

                    <div className="kcxp-env-pairs">
                        <DbPair
                            label="数据库地址"
                            tip="SQL Server 主机地址"
                            fieldId={fieldId('db-server')}
                        >
                            <Input
                                id={fieldId('db-server')}
                                value={database.server}
                                onChange={(e) =>
                                    updateField('database', {
                                        ...database,
                                        server: e.target.value,
                                    })
                                }
                                placeholder="127.0.0.1"
                                size="sm"
                            />
                        </DbPair>
                        <DbPair
                            label="端口"
                            tip="SQL Server 端口，默认 1433"
                            fieldId={fieldId('db-port')}
                        >
                            <Input
                                id={fieldId('db-port')}
                                className="kcxp-env-control-narrow"
                                value={String(database.port ?? '')}
                                onChange={(e) =>
                                    updateField('database', {
                                        ...database,
                                        port: e.target.value ? Number(e.target.value) : undefined,
                                    })
                                }
                                placeholder="1433"
                                size="sm"
                            />
                        </DbPair>
                        <DbPair label="数据库名" tip="目标数据库名称" fieldId={fieldId('db-name')}>
                            <Input
                                id={fieldId('db-name')}
                                value={database.database}
                                onChange={(e) =>
                                    updateField('database', {
                                        ...database,
                                        database: e.target.value,
                                    })
                                }
                                placeholder="数据库名"
                                size="sm"
                            />
                        </DbPair>
                        <DbPair label="账号" tip="数据库登录账号" fieldId={fieldId('db-user')}>
                            <Input
                                id={fieldId('db-user')}
                                value={database.user}
                                onChange={(e) =>
                                    updateField('database', {
                                        ...database,
                                        user: e.target.value,
                                    })
                                }
                                placeholder="用户名"
                                size="sm"
                            />
                        </DbPair>
                        <DbPair label="密码" tip="数据库登录密码" fieldId={fieldId('db-password')}>
                            <Input
                                id={fieldId('db-password')}
                                value={database.password}
                                onChange={(e) =>
                                    updateField('database', {
                                        ...database,
                                        password: e.target.value,
                                    })
                                }
                                placeholder="密码"
                                size="sm"
                            />
                        </DbPair>
                        <DbPair
                            label="查询超时 (ms)"
                            tip="单条 SQL 查询超时时间（毫秒）"
                            fieldId={fieldId('db-timeout')}
                        >
                            <Input
                                id={fieldId('db-timeout')}
                                className="kcxp-env-control-narrow"
                                value={String(database.queryTimeoutMs ?? '')}
                                onChange={(e) =>
                                    updateField('database', {
                                        ...database,
                                        queryTimeoutMs: e.target.value
                                            ? Number(e.target.value)
                                            : undefined,
                                    })
                                }
                                placeholder="查询超时(ms)"
                                size="sm"
                            />
                        </DbPair>
                        <DbPair
                            label="最大行数"
                            tip="查询返回的最大行数上限"
                            fieldId={fieldId('db-max-rows')}
                        >
                            <Input
                                id={fieldId('db-max-rows')}
                                className="kcxp-env-control-narrow"
                                value={String(database.maxRows ?? '')}
                                onChange={(e) =>
                                    updateField('database', {
                                        ...database,
                                        maxRows: e.target.value
                                            ? Number(e.target.value)
                                            : undefined,
                                    })
                                }
                                placeholder="最大行数"
                                size="sm"
                            />
                        </DbPair>
                    </div>
                </section>
            </div>
        </div>
    );
}
