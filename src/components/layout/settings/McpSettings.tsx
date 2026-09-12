import { useCallback, useEffect, useState } from 'react';
import { App, Switch, Tag, Typography } from 'antd';
import type { McpAuditEntry, McpState } from '@/shared/mcp/types';
import { readMcpState, saveMcpSettings } from '../../../lib/mcpClient';

const MAX_VISIBLE_AUDIT = 20;

function formatTime(at: number): string {
    const date = new Date(at);
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function auditHint(entry: McpAuditEntry): string {
    const parts = [formatTime(entry.at), entry.argsSummary, `${entry.durationMs}ms`];
    if (!entry.ok && entry.error) parts.push(entry.error);
    return parts.join(' · ');
}

/**
 * MCP 设置分区。
 *
 * 平台级设施，因此挂在平台设置里而不是任何子模块下。关闭时服务器**完全不启动**，
 * 界面上会明确显示"没有端口在监听"。
 */
export default function McpSettings() {
    const { message } = App.useApp();
    const [state, setState] = useState<McpState | null>(null);
    const [saving, setSaving] = useState(false);

    const refresh = useCallback(async () => {
        setState(await readMcpState());
    }, []);

    useEffect(() => {
        void refresh().catch(() => setState(null));
    }, [refresh]);

    const toggle = useCallback(
        async (enabled: boolean) => {
            setSaving(true);
            try {
                setState(await saveMcpSettings({ enabled }));
                message.success(enabled ? '已允许外部调用' : '已停止对外提供能力');
            } catch (error) {
                message.error(error instanceof Error ? error.message : '设置保存失败');
                await refresh();
            } finally {
                setSaving(false);
            }
        },
        [message, refresh],
    );

    const audit = state?.audit ?? [];

    return (
        <div className="settings-panel">
            <Typography.Title level={5} className="settings-panel-title">
                MCP
            </Typography.Title>
            <Typography.Paragraph className="settings-panel-desc">
                把应用能力以 MCP 开放给外部 Agent（Claude Desktop / Cursor 等）。
                模型与凭据都在你选择的客户端里，应用不保存它们。
            </Typography.Paragraph>

            <div className="settings-panel-group settings-toggle-group">
                <div className="settings-panel-row">
                    <div className="settings-panel-row-copy">
                        <div className="settings-panel-row-label">允许外部调用</div>
                        <div className="settings-panel-row-hint">
                            {state?.running
                                ? `正在监听 ${state.url ?? ''}（${state.toolCount} 个能力可用）`
                                : '关闭时服务器不会启动，本机没有任何端口在监听'}
                        </div>
                    </div>
                    <Switch
                        className="settings-switch"
                        checked={state?.enabled ?? false}
                        disabled={!state || saving}
                        onChange={(checked) => void toggle(checked)}
                    />
                </div>
            </div>

            <Typography.Title level={5} className="settings-panel-title">
                最近调用
            </Typography.Title>
            <Typography.Paragraph className="settings-panel-desc">
                只记录参数名，不记录取值。保留最近 200 条。
            </Typography.Paragraph>

            {audit.length === 0 ? (
                <Typography.Paragraph className="settings-panel-row-hint">
                    暂无可显示的调用记录
                </Typography.Paragraph>
            ) : (
                <div className="settings-panel-group">
                    {audit.slice(0, MAX_VISIBLE_AUDIT).map((entry) => (
                        <div className="settings-panel-row" key={`${entry.at}-${entry.tool}`}>
                            <div className="settings-panel-row-copy">
                                <div className="settings-panel-row-label">{entry.tool}</div>
                                <div className="settings-panel-row-hint">{auditHint(entry)}</div>
                            </div>
                            <Tag color={entry.ok ? 'green' : 'red'}>
                                {entry.ok ? '成功' : '失败'}
                            </Tag>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
