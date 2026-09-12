import type { MouseEvent, ReactNode } from 'react';
import { Button, Popconfirm, Switch, Tag, Tooltip, Typography } from 'antd';
import { DeleteOutlined, DownOutlined, RightOutlined } from '@ant-design/icons';
import type { ParamFieldRule } from '../../types/paramSuggest';
import {
    formatRuleMatchSummary,
    formatRuleTierLabel,
    getRuleMatchTier,
    getRuleTierColor,
} from '../../utils/suggest/paramSuggestResolve';
import {
    buildSqlSummary,
    formatRuleResolutionTooltip,
} from '../../utils/suggest/paramSuggestRuleDisplay';

interface ParamSuggestRuleTableProps {
    fieldLabel: string;
    rules: ParamFieldRule[];
    expandedRuleId: string | null;
    onToggleExpanded: (rule: ParamFieldRule) => void;
    onToggleEnabled: (rule: ParamFieldRule, enabled: boolean) => void;
    onDeleteRule: (ruleId: string) => void;
    renderExpanded: (rule: ParamFieldRule) => ReactNode;
}

function stopPropagation(event: MouseEvent<HTMLElement>): void {
    event.stopPropagation();
}

function RuleSummary({ rule, rank }: { rule: ParamFieldRule; rank: number }) {
    const tier = getRuleMatchTier(rule);
    return (
        <div className="param-suggest-rule-card-summary">
            <Tooltip title={formatRuleResolutionTooltip(rule, rank)}>
                <span className="param-suggest-rule-rank">#{rank}</span>
            </Tooltip>
            <div className="param-suggest-rule-card-main">
                <div className="param-suggest-rule-card-title">
                    <Tag color={getRuleTierColor(tier)}>{formatRuleTierLabel(tier)}</Tag>
                    {formatRuleMatchSummary(rule).map((summary) => (
                        <Tag key={summary} className="param-suggest-match-tag">
                            {summary}
                        </Tag>
                    ))}
                </div>
                <Typography.Text type="secondary" ellipsis className="param-suggest-rule-card-sql">
                    {buildSqlSummary(rule.datasource.sql)}
                </Typography.Text>
            </div>
        </div>
    );
}

export default function ParamSuggestRuleTable({
    fieldLabel,
    rules,
    expandedRuleId,
    onToggleExpanded,
    onToggleEnabled,
    onDeleteRule,
    renderExpanded,
}: ParamSuggestRuleTableProps) {
    if (rules.length === 0) {
        return (
            <div className="param-suggest-rule-empty">
                <Typography.Text type="secondary">
                    字段 {fieldLabel} 暂无规则，可点击上方按钮添加。
                </Typography.Text>
            </div>
        );
    }

    return (
        <div className="param-suggest-rule-list">
            {rules.map((rule, index) => {
                const expanded = expandedRuleId === rule.id;
                const disabled = rule.enabled === false;
                return (
                    <div
                        key={rule.id}
                        className={`param-suggest-rule-card${expanded ? ' is-expanded' : ''}${disabled ? ' is-disabled' : ''}`}
                    >
                        <div className="param-suggest-rule-card-header">
                            <button
                                type="button"
                                className="param-suggest-rule-card-toggle"
                                aria-expanded={expanded}
                                onClick={() => onToggleExpanded(rule)}
                            >
                                <span className="param-suggest-rule-card-chevron">
                                    {expanded ? <DownOutlined /> : <RightOutlined />}
                                </span>
                                <RuleSummary rule={rule} rank={index + 1} />
                            </button>
                            <div
                                className="param-suggest-rule-card-actions"
                                onClick={stopPropagation}
                            >
                                <Switch
                                    size="small"
                                    checked={!disabled}
                                    aria-label={`启用规则 ${index + 1}`}
                                    onChange={(checked) => onToggleEnabled(rule, checked)}
                                />
                                <Popconfirm
                                    title="确定删除此规则？"
                                    onConfirm={() => onDeleteRule(rule.id)}
                                >
                                    <Button
                                        type="text"
                                        size="small"
                                        danger
                                        aria-label={`删除规则 ${index + 1}`}
                                        icon={<DeleteOutlined />}
                                    />
                                </Popconfirm>
                            </div>
                        </div>
                        {expanded ? (
                            <div className="param-suggest-rule-card-body">
                                {renderExpanded(rule)}
                            </div>
                        ) : null}
                    </div>
                );
            })}
        </div>
    );
}
