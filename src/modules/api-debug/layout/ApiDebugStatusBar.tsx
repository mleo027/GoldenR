import { useMemo } from 'react';
import { Button, Dropdown, Tooltip } from 'antd';
import {
    CheckCircleFilled,
    CloseCircleFilled,
    DeleteOutlined,
    HistoryOutlined,
} from '@ant-design/icons';
import PlatformStatusBar from '../../../platform/shell/PlatformStatusBar';
import { useRunLogState, useRunLogActions } from '../store/useRunLog';
import { formatDateTime } from '../../../utils/formatDateTime';

export default function ApiDebugStatusBar() {
    const { logs } = useRunLogState();
    const { clearLogs } = useRunLogActions();
    const latest = logs[0];

    const historyItems = useMemo(
        () =>
            logs.map((log) => ({
                key: log.id,
                label: (
                    <div className="status-bar-history-item">
                        {log.success ? (
                            <CheckCircleFilled className="status-bar-history-icon status-bar-history-success" />
                        ) : (
                            <CloseCircleFilled className="status-bar-history-icon status-bar-history-error" />
                        )}
                        <div className="status-bar-history-content">
                            <span className="status-bar-history-name">{log.caseName}</span>
                            <span className="status-bar-history-meta">
                                {formatDateTime(log.timestamp)}
                                {log.rows != null ? ` · ${log.rows} 行` : ''}
                                {log.timecost != null ? ` · ${log.timecost}ms` : ''}
                            </span>
                        </div>
                    </div>
                ),
            })),
        [logs],
    );

    return (
        <PlatformStatusBar
            className={latest && !latest.success ? 'status-bar--error' : undefined}
            actions={
                logs.length > 0 ? (
                    <>
                        <Dropdown
                            menu={{ items: historyItems }}
                            trigger={['click']}
                            placement="topRight"
                        >
                            <Button
                                type="text"
                                size="small"
                                icon={<HistoryOutlined />}
                                className="status-bar-history-btn"
                                title="历史请求日志"
                            />
                        </Dropdown>
                        <Button
                            type="text"
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={clearLogs}
                            className="status-bar-clear"
                            title="清空日志"
                        />
                    </>
                ) : null
            }
        >
            {latest ? (
                <>
                    <Tooltip title={latest.success ? '成功' : '请求失败'}>
                        <span
                            className={`status-bar-dot${latest.success ? ' status-bar-dot-success' : ' status-bar-dot-error'}`}
                            aria-label={latest.success ? '成功' : '请求失败'}
                        />
                    </Tooltip>

                    {!latest.success ? (
                        <span className="status-bar-error-label">请求失败</span>
                    ) : null}

                    {latest.rows != null && (
                        <span className="status-bar-stat">{latest.rows} 行</span>
                    )}

                    {latest.timecost != null && (
                        <span className="status-bar-stat status-bar-stat-time">
                            {latest.timecost}ms
                        </span>
                    )}

                    <span className="status-bar-time">{formatDateTime(latest.timestamp)}</span>
                </>
            ) : (
                <span className="status-bar-muted">就绪</span>
            )}
        </PlatformStatusBar>
    );
}
