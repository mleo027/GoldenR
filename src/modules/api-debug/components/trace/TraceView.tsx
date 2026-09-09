import { useMemo } from 'react';
import { Button } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { useRequestHistoryNavigation } from '../../store/useRequestHistoryNavigation';
import { formatSql, highlightSql } from '../../utils/sql/sqlFormat';

function FormattedSql({ sql }: { sql: string }) {
    const formatted = useMemo(() => formatSql(sql), [sql]);
    const highlighted = useMemo(() => highlightSql(formatted), [formatted]);

    return (
        <pre className="px-3 py-2 border-t border-slate-200 dark:border-slate-700 whitespace-pre-wrap break-words overflow-x-auto text-sm bg-slate-50 dark:bg-slate-900 font-mono">
            { }
            <code dangerouslySetInnerHTML={{ __html: highlighted }} />
        </pre>
    );
}

export default function TraceView() {
    const { traceData, traceCaseName, closeTrace } = useRequestHistoryNavigation();

    if (!traceData) return null;

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-700">
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
                        className="mb-2 border border-slate-200 dark:border-slate-700 rounded"
                    >
                        <summary className="cursor-pointer px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800">
                            <span className="mr-3">
                                {new Date(event.timestampUtc).toLocaleTimeString()}
                            </span>
                            <span className="mr-3 font-medium">{event.eventType}</span>
                            <span className="text-blue-600 dark:text-blue-400">
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
