import { useMemo } from 'react';
import { Button } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { useRequestHistoryNavigation } from '../../store/useRequestHistoryNavigation';
import { formatSql, highlightSql } from '../../utils/sql/sqlFormat';

function FormattedSql({ sql }: { sql: string }) {
    const formatted = useMemo(() => formatSql(sql), [sql]);
    const highlighted = useMemo(() => highlightSql(formatted), [formatted]);

    return (
        <pre className="trace-view-sql px-3 py-2 whitespace-pre-wrap break-words overflow-x-auto text-sm font-mono">
            {}
            <code dangerouslySetInnerHTML={{ __html: highlighted }} />
        </pre>
    );
}

export default function TraceView() {
    const { traceData, traceCaseName, closeTrace } = useRequestHistoryNavigation();

    if (!traceData) return null;

    return (
        <div className="trace-view flex flex-col h-full">
            <div className="trace-view-header flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-2">
                    <span className="font-medium">SQL Trace</span>
                    <span className="text-xs opacity-60">— {traceCaseName}</span>
                    <span className="text-xs opacity-60">({traceData.events.length} events)</span>
                </div>
                <Button
                    type="text"
                    size="small"
                    icon={<CloseOutlined />}
                    onClick={closeTrace}
                    aria-label="关闭 Trace 视图"
                />
            </div>
            <div className="flex-1 overflow-auto p-4">
                {traceData.startError || traceData.readError || traceData.stopError ? (
                    <div className="text-sm text-red-500 mb-4">
                        {traceData.startError || traceData.readError || traceData.stopError}
                    </div>
                ) : null}
                {traceData.events.length === 0 && !traceData.startError && !traceData.readError ? (
                    <div className="text-sm opacity-60">Trace 已开启但未捕获 SQL</div>
                ) : null}
                {traceData.events.map((event, index) => (
                    <details
                        key={`${event.timestampUtc}-${index}`}
                        open
                        className="trace-view-event mb-2 rounded"
                    >
                        <summary className="trace-view-summary cursor-pointer px-3 py-2">
                            <span className="mr-3">
                                {new Date(event.timestampUtc).toLocaleTimeString()}
                            </span>
                            <span className="mr-3 font-medium">{event.eventType}</span>
                            <span className="trace-view-duration">
                                {event.durationMs.toFixed(2)} ms
                            </span>
                            {event.objectName && (
                                <span className="ml-3 opacity-60">{event.objectName}</span>
                            )}
                        </summary>
                        <FormattedSql sql={event.sqlText} />
                    </details>
                ))}
            </div>
        </div>
    );
}
