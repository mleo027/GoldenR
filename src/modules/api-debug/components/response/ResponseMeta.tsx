import { Tag, Tooltip } from 'antd';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { ResponseData } from '../../types/workspace';
import { parseKcbpResponseStatus } from '../../utils/kcbp/kcbpResponse';
import { formatDateTime } from '../../../../utils/formatDateTime';
import { formatDataSize } from '../../../../utils/exportTable';

interface ResponseMetaProps {
    response: ResponseData;
    className?: string;
    /** footer：仅展示 StatusBar 未覆盖的业务码、体积等；full：完整元信息 */
    variant?: 'full' | 'footer';
}

function StatusBadge({ kind }: { kind: 'success' | 'warning' | 'error' }) {
    if (kind === 'success') {
        return (
            <Tag bordered={false} className="response-meta-badge response-meta-badge-success">
                <CheckCircleOutlined className="mr-1" />
                Success
            </Tag>
        );
    }
    if (kind === 'warning') {
        return (
            <Tag bordered={false} className="response-meta-badge response-meta-badge-warning">
                <ExclamationCircleOutlined className="mr-1" />
                Warning
            </Tag>
        );
    }
    return (
        <Tag bordered={false} className="response-meta-badge response-meta-badge-error">
            <CloseCircleOutlined className="mr-1" />
            Error
        </Tag>
    );
}

export default function ResponseMeta({ response, className, variant = 'full' }: ResponseMetaProps) {
    const status = parseKcbpResponseStatus(response);
    const { stats, calledAt, data } = response;
    const rowCount = stats?.rows ?? data.length;
    const dataSize = formatDataSize(data);
    const isFooter = variant === 'footer';

    const hasFooterContent =
        status.businessMsg ||
        data.length > 0 ||
        (status.hasBusinessRow && String(status.transportCode) !== String(status.businessCode));

    if (isFooter && !hasFooterContent) {
        return null;
    }

    if (isFooter) {
        return (
            <div
                className={`response-meta flex items-center gap-2 min-w-0 flex-wrap ${className ?? ''}`}
            >
                {status.businessMsg && (
                    <>
                        <Tag
                            bordered={false}
                            className="response-meta-badge response-meta-badge-muted shrink-0"
                        >
                            {status.businessCode}
                        </Tag>
                        <Tooltip title={status.businessMsg}>
                            <span className="response-meta-msg truncate">{status.businessMsg}</span>
                        </Tooltip>
                    </>
                )}

                {data.length > 0 && (
                    <>
                        {status.businessMsg && (
                            <span className="response-meta-sep shrink-0" aria-hidden="true" />
                        )}
                        <Tooltip title="响应数据大小">
                            <Tag bordered={false} className="response-meta-badge shrink-0">
                                {dataSize}
                            </Tag>
                        </Tooltip>
                    </>
                )}

                {status.hasBusinessRow &&
                    String(status.transportCode) !== String(status.businessCode) && (
                        <>
                            <span className="response-meta-sep shrink-0" aria-hidden="true" />
                            <Tooltip
                                title={`传输层: ${status.transportCode} ${status.transportMsg}`}
                            >
                                <Tag
                                    bordered={false}
                                    className="response-meta-badge response-meta-badge-muted shrink-0"
                                >
                                    传输 {status.transportCode}
                                </Tag>
                            </Tooltip>
                        </>
                    )}
            </div>
        );
    }

    return (
        <div
            className={`response-meta flex items-center gap-1.5 min-w-0 flex-wrap ${className ?? ''}`}
        >
            {!isFooter && <StatusBadge kind={status.kind} />}

            {status.businessMsg && (
                <Tooltip title={status.businessMsg}>
                    <Tag bordered={false} className="response-meta-badge response-meta-badge-muted">
                        {status.businessCode}
                    </Tag>
                </Tooltip>
            )}

            {!isFooter && (
                <Tooltip title={`返回 ${rowCount} 行`}>
                    <Tag bordered={false} className="response-meta-badge">
                        {rowCount} Rows
                    </Tag>
                </Tooltip>
            )}

            {!isFooter && stats && (
                <Tooltip title={`耗时 ${stats.timecost}ms`}>
                    <Tag bordered={false} className="response-meta-badge response-meta-badge-time">
                        {stats.timecost} ms
                    </Tag>
                </Tooltip>
            )}

            {data.length > 0 && (
                <Tooltip title="响应数据大小">
                    <Tag bordered={false} className="response-meta-badge">
                        {dataSize}
                    </Tag>
                </Tooltip>
            )}

            {!isFooter && calledAt != null && (
                <Tooltip title={`调用时间 ${formatDateTime(calledAt)}`}>
                    <Tag bordered={false} className="response-meta-badge response-meta-badge-muted">
                        {formatDateTime(calledAt)}
                    </Tag>
                </Tooltip>
            )}

            {status.hasBusinessRow &&
                String(status.transportCode) !== String(status.businessCode) && (
                    <Tooltip title={`传输层: ${status.transportCode} ${status.transportMsg}`}>
                        <Tag
                            bordered={false}
                            className="response-meta-badge response-meta-badge-muted"
                        >
                            传输 {status.transportCode}
                        </Tag>
                    </Tooltip>
                )}
        </div>
    );
}
