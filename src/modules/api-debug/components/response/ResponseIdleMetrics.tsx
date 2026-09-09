import { memo } from 'react';
import type { ResponseData } from '../../types/workspace';
import { formatByteSize } from '../../../../utils/exportTable';
import { parseKcbpResponseStatus } from '../../utils/kcbp/kcbpResponse';

interface ResponseIdleMetricsProps {
    response?: ResponseData;
    loading?: boolean;
}

function formatStatus(response?: ResponseData): string {
    if (!response) return '--';
    return String(response.code);
}

function formatTime(response?: ResponseData): string {
    const ms = response?.stats?.timecost;
    if (ms == null) return '--';
    return `${ms} ms`;
}

function formatSize(response?: ResponseData): string {
    if (!response?.resultSets) return '--';
    try {
        return formatByteSize(JSON.stringify(response.resultSets).length);
    } catch {
        return '--';
    }
}

function ResponseIdleMetrics({ response, loading = false }: ResponseIdleMetricsProps) {
    const hasResponse = Boolean(response);
    const statusKind = response ? parseKcbpResponseStatus(response).kind : 'idle';

    return (
        <div
            className={`response-idle response-idle-${statusKind}${loading ? ' response-idle-loading' : ''}`}
            aria-busy={loading}
        >
            <div className="response-idle-metrics">
                <div className="response-idle-metric">
                    <span className="response-idle-metric-label">状态</span>
                    <span
                        className={`response-idle-metric-value${hasResponse ? ' response-idle-metric-value-filled' : ''}`}
                    >
                        {loading ? '…' : formatStatus(response)}
                    </span>
                </div>
                <div className="response-idle-metric">
                    <span className="response-idle-metric-label">耗时</span>
                    <span
                        className={`response-idle-metric-value${hasResponse ? ' response-idle-metric-value-filled' : ''}`}
                    >
                        {loading ? '…' : formatTime(response)}
                    </span>
                </div>
                <div className="response-idle-metric">
                    <span className="response-idle-metric-label">大小</span>
                    <span
                        className={`response-idle-metric-value${hasResponse ? ' response-idle-metric-value-filled' : ''}`}
                    >
                        {loading ? '…' : formatSize(response)}
                    </span>
                </div>
            </div>
            {response?.message ? (
                <div className={`response-idle-msg response-idle-msg-${statusKind}`} role="status">
                    <span className="response-idle-msg-indicator" aria-hidden="true" />
                    <span className="response-idle-msg-label">服务端消息</span>
                    <span className="response-idle-msg-value">{response.message}</span>
                </div>
            ) : null}
            {!hasResponse && !loading ? (
                <p className="response-idle-hint">配置请求参数后点击 Run</p>
            ) : null}
            {!hasResponse && loading ? (
                <p className="response-idle-hint" role="status">
                    请求进行中…
                </p>
            ) : null}
        </div>
    );
}

export default memo(ResponseIdleMetrics);
