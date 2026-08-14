import { useMemo } from 'react';
import { Button, Tooltip } from 'antd';
import { ClearOutlined, CodeOutlined } from '@ant-design/icons';
import type { ScriptConsoleSnapshot } from '../../types/scriptConsole';

interface ScriptConsolePanelProps {
    snapshot: ScriptConsoleSnapshot | undefined;
    onClear: () => void;
}

function formatConsoleTime(timestamp: number): string {
    const date = new Date(timestamp);
    const pad = (value: number, len = 2) => String(value).padStart(len, '0');
    const ms = pad(date.getMilliseconds(), 3);

    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${ms}`;
}

export default function ScriptConsolePanel({ snapshot, onClear }: ScriptConsolePanelProps) {
    const lines = useMemo(() => snapshot?.entries ?? [], [snapshot?.entries]);
    const hasOutput = lines.length > 0;

    return (
        <div className="script-console-panel">
            <div className="script-console-header">
                <span className="script-console-title">控制台</span>
                <Tooltip title="清空输出">
                    <Button
                        type="text"
                        size="small"
                        icon={<ClearOutlined />}
                        disabled={!hasOutput}
                        onClick={onClear}
                        className="script-console-clear-btn"
                        aria-label="清空控制台"
                    />
                </Tooltip>
            </div>
            <div className="script-console-body ui-scroll">
                {hasOutput ? (
                    lines.map((entry, index) => (
                        <div
                            key={`${entry.timestamp}-${index}`}
                            className={`script-console-line script-console-line-${entry.level}`}
                        >
                            <span className="script-console-time">
                                {formatConsoleTime(entry.timestamp)}
                            </span>
                            <span className="script-console-level">{entry.level}</span>
                            <pre className="script-console-message">{entry.message}</pre>
                        </div>
                    ))
                ) : (
                    <div className="script-console-empty">
                        <CodeOutlined className="script-console-empty-icon" aria-hidden />
                        <span>Run 后显示 test / console 输出</span>
                    </div>
                )}
            </div>
        </div>
    );
}
