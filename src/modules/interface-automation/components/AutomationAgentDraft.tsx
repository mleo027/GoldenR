import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/primitives';
import type { AgentScriptDraft } from '../store/agentStore';
import { diffScriptLines, summarizeDiff } from '../utils/scriptDiff';

/**
 * Agent 产出的脚本草稿卡片：展示行级 diff，并提供应用 / 应用并运行 / 回滚。
 * 自动写入档位下仍然保留回滚入口，避免 Agent 改动无法撤销。
 */
export default function AutomationAgentDraft({
    draft,
    busy,
    onApply,
    onApplyAndRun,
    onRollback,
}: {
    draft: AgentScriptDraft;
    busy: boolean;
    onApply: (draft: AgentScriptDraft) => void;
    onApplyAndRun: (draft: AgentScriptDraft) => void;
    onRollback: (draft: AgentScriptDraft) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const lines = useMemo(
        () => diffScriptLines(draft.previousScript ?? '', draft.script),
        [draft.previousScript, draft.script],
    );
    const stats = useMemo(() => summarizeDiff(lines), [lines]);
    const canRollback = draft.previousScript !== undefined;

    return (
        <div className="automation-agent-draft">
            <div className="automation-agent-draft-head">
                <span className="automation-agent-draft-title">
                    脚本改动
                    <b className="is-added">+{stats.added}</b>
                    <b className="is-removed">-{stats.removed}</b>
                </span>
                <button
                    type="button"
                    className="automation-agent-link"
                    onClick={() => setExpanded((value) => !value)}
                >
                    {expanded ? '收起' : '查看差异'}
                </button>
            </div>
            {draft.summary ? (
                <div className="automation-agent-draft-summary">{draft.summary}</div>
            ) : null}
            {expanded ? (
                <pre className="automation-agent-diff">
                    {lines.map((line, index) => (
                        <span
                            // 行内容可能重复，索引参与 key 才能稳定渲染 diff。
                            key={`${index}-${line.kind}`}
                            className={`automation-agent-diff-line is-${line.kind}`}
                        >
                            {line.kind === 'added' ? '+' : line.kind === 'removed' ? '-' : ' '}
                            {line.text}
                        </span>
                    ))}
                </pre>
            ) : null}
            <div className="automation-agent-draft-actions">
                <Button
                    size="sm"
                    variant="primary"
                    disabled={busy}
                    onClick={() => onApplyAndRun(draft)}
                >
                    应用并运行
                </Button>
                <Button size="sm" disabled={busy} onClick={() => onApply(draft)}>
                    应用
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy || !canRollback}
                    onClick={() => onRollback(draft)}
                >
                    回滚
                </Button>
            </div>
        </div>
    );
}
