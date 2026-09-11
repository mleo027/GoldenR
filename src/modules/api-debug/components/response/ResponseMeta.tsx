import { Tag, Tooltip } from 'antd';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { ResponseData } from '../../types/workspace';
import { parseKcbpResponseStatus, sumResultSetRows } from '../../utils/kcbp/kcbpResponse';
import { formatDateTime } from '../../../../utils/formatDateTime';
import { formatDataSize } from '../../../../utils/exportTable';
import { ControlCharText } from '../../../../utils/ControlCharText';
import { formatControlCharsForTitle } from '../../../../utils/controlCharDisplay';

interface ResponseMetaProps {
    response: ResponseData;
    className?: string;
    variant?: 'full' | 'footer';
}

type StatusKind = 'success' | 'warning' | 'error';

function StatusBadge({ kind }: { kind: StatusKind }) {
    const content = {
        success: { icon: <CheckCircleOutlined className="mr-1" />, label: 'Success' },
        warning: { icon: <ExclamationCircleOutlined className="mr-1" />, label: 'Warning' },
        error: { icon: <CloseCircleOutlined className="mr-1" />, label: 'Error' },
    }[kind];

    return (
        <Tag bordered={false} className={`response-meta-badge response-meta-badge-${kind}`}>
            {content.icon}
            {content.label}
        </Tag>
    );
}

function hasTransportMismatch(response: ResponseData): boolean {
    const status = parseKcbpResponseStatus(response);
    return status.hasBusinessRow && String(status.transportCode) !== String(status.businessCode);
}

function isNonZeroCode(code: string | number): boolean {
    return String(code).trim() !== '0';
}

function ResponseMetaFooter({ response, className }: ResponseMetaProps) {
    const status = parseKcbpResponseStatus(response);
    const dataSize = formatDataSize(response.resultSets);
    const rowCount = response.stats?.rows ?? sumResultSetRows(response.resultSets);
    const showInlineDetails = false;
    const hoverDetails = [
        `${rowCount} Rows`,
        response.stats ? `${response.stats.timecost} ms` : null,
        response.resultSets.length > 0 ? dataSize : null,
        response.calledAt != null ? formatDateTime(response.calledAt) : null,
        hasTransportMismatch(response) ? `Transport ${status.transportCode}` : null,
    ]
        .filter(Boolean)
        .join(' · ');

    return (
        <div
            className={`response-meta flex items-center gap-2 min-w-0 flex-wrap ${className ?? ''}`}
            title={hoverDetails || undefined}
        >
            {status.businessMsg && (
                <>
                    <Tag
                        bordered={false}
                        className={`response-meta-badge response-meta-badge-muted shrink-0${isNonZeroCode(status.businessCode) ? ' response-meta-code-nonzero' : ''}`}
                    >
                        {status.businessCode}
                    </Tag>
                    <Tooltip title={formatControlCharsForTitle(status.businessMsg)}>
                        <ControlCharText
                            className={`response-meta-msg truncate${isNonZeroCode(status.businessCode) ? ' response-meta-msg-nonzero' : ''}`}
                            text={status.businessMsg}
                        />
                    </Tooltip>
                </>
            )}
            {/* Additional metrics are available through the native title tooltip. */}
            {showInlineDetails && response.resultSets.length > 0 && (
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
            {showInlineDetails && hasTransportMismatch(response) && (
                <>
                    <span className="response-meta-sep shrink-0" aria-hidden="true" />
                    <Tooltip
                        title={`传输层 ${status.transportCode} ${formatControlCharsForTitle(status.transportMsg)}`}
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

function ResponseMetaDetails({ response, className }: ResponseMetaProps) {
    const status = parseKcbpResponseStatus(response);
    const rowCount = response.stats?.rows ?? sumResultSetRows(response.resultSets);
    const dataSize = formatDataSize(response.resultSets);

    return (
        <div
            className={`response-meta flex items-center gap-1.5 min-w-0 flex-wrap ${className ?? ''}`}
        >
            <StatusBadge kind={status.kind} />
            {status.businessMsg && (
                <>
                    <Tag
                        bordered={false}
                        className={`response-meta-badge response-meta-badge-muted${isNonZeroCode(status.businessCode) ? ' response-meta-code-nonzero' : ''}`}
                    >
                        {status.businessCode}
                    </Tag>
                    <Tooltip title={formatControlCharsForTitle(status.businessMsg)}>
                        <ControlCharText
                            className={`response-meta-msg truncate${isNonZeroCode(status.businessCode) ? ' response-meta-msg-nonzero' : ''}`}
                            text={status.businessMsg}
                        />
                    </Tooltip>
                </>
            )}
            <Tooltip title={`返回 ${rowCount} 行`}>
                <Tag bordered={false} className="response-meta-badge">
                    {rowCount} Rows
                </Tag>
            </Tooltip>
            {response.stats && (
                <Tooltip title={`耗时 ${response.stats.timecost}ms`}>
                    <Tag bordered={false} className="response-meta-badge response-meta-badge-time">
                        {response.stats.timecost} ms
                    </Tag>
                </Tooltip>
            )}
            {response.resultSets.length > 0 && (
                <Tooltip title="响应数据大小">
                    <Tag bordered={false} className="response-meta-badge">
                        {dataSize}
                    </Tag>
                </Tooltip>
            )}
            {response.calledAt != null && (
                <Tooltip title={`调用时间 ${formatDateTime(response.calledAt)}`}>
                    <Tag bordered={false} className="response-meta-badge response-meta-badge-muted">
                        {formatDateTime(response.calledAt)}
                    </Tag>
                </Tooltip>
            )}
            {hasTransportMismatch(response) && (
                <Tooltip
                    title={`传输层 ${status.transportCode} ${formatControlCharsForTitle(status.transportMsg)}`}
                >
                    <Tag bordered={false} className="response-meta-badge response-meta-badge-muted">
                        传输 {status.transportCode}
                    </Tag>
                </Tooltip>
            )}
        </div>
    );
}

export default function ResponseMeta({ response, className, variant = 'full' }: ResponseMetaProps) {
    if (variant === 'footer') {
        const status = parseKcbpResponseStatus(response);
        const hasContent =
            status.businessMsg || response.resultSets.length > 0 || hasTransportMismatch(response);
        return hasContent ? <ResponseMetaFooter response={response} className={className} /> : null;
    }
    return <ResponseMetaDetails response={response} className={className} />;
}
