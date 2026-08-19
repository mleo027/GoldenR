import { useMemo, useState } from 'react';
import { Button, Popconfirm, Space, Switch, Table, Tag, Tooltip, Typography } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { ParamFieldRule } from '../../types/paramSuggest';
import {
    formatRuleMatchSummary,
    formatRuleTierLabel,
    getRuleMatchTier,
    getRuleTierColor,
} from '../../utils/suggest/paramSuggestResolve';
import {
    extractSqlPlaceholderDefs,
    formatSqlPlaceholderToken,
} from '../../utils/suggest/paramSuggestSql';
import {
    buildSqlSummary,
    formatRuleResolutionTooltip,
} from '../../utils/suggest/paramSuggestRuleDisplay';
import ParamSuggestSqlDrawer from './ParamSuggestSqlDrawer';

const DEP_FILLED_PREFIX = '需已填 ';

interface ParamSuggestRuleTableProps {
    fieldLabel: string;
    rules: ParamFieldRule[];
    onEditRule: (rule: ParamFieldRule) => void;
    onToggleEnabled: (rule: ParamFieldRule, enabled: boolean) => void;
    onDeleteRule: (ruleId: string) => void;
    onDepFieldClick?: (fieldName: string) => void;
}

function renderDepTags(record: ParamFieldRule, onDepFieldClick?: (fieldName: string) => void) {
    const deps = extractSqlPlaceholderDefs(record.datasource.sql);
    if (deps.length === 0) return '—';
    return (
        <Space size={[4, 4]} wrap>
            {deps.map((item) => (
                <Tag
                    key={`${record.id}-${item.name}`}
                    color={item.optional ? 'default' : 'cyan'}
                    className={`param-suggest-sql-dep-tag${onDepFieldClick ? ' param-suggest-sql-dep-tag-clickable' : ''}`}
                    onClick={
                        onDepFieldClick
                            ? (event) => {
                                  event.stopPropagation();
                                  onDepFieldClick(item.name);
                              }
                            : undefined
                    }
                >
                    {formatSqlPlaceholderToken(item)}
                    <span className="param-suggest-sql-dep-role">
                        {item.optional ? '可选' : '必填'}
                    </span>
                </Tag>
            ))}
        </Space>
    );
}

function renderRankCell(record: ParamFieldRule, index: number) {
    const disabled = record.enabled === false;
    const rank = index + 1;
    return (
        <Tooltip title={formatRuleResolutionTooltip(record, rank)}>
            <span
                className={`param-suggest-rule-rank${index === 0 && !disabled ? ' param-suggest-rule-rank-primary' : ''}${disabled ? ' param-suggest-rule-rank-disabled' : ''}`}
            >
                #{rank}
            </span>
        </Tooltip>
    );
}

function renderMatchCell(record: ParamFieldRule, onDepFieldClick?: (fieldName: string) => void) {
    return (
        <Space size={[4, 4]} wrap>
            {formatRuleMatchSummary(record).map((tag) => {
                const depName = tag.startsWith(DEP_FILLED_PREFIX)
                    ? tag.slice(DEP_FILLED_PREFIX.length)
                    : tag;
                const clickable = tag.startsWith(DEP_FILLED_PREFIX) && onDepFieldClick;
                return (
                    <Tag
                        key={`${record.id}-${tag}`}
                        className={`param-suggest-match-tag${clickable ? ' param-suggest-match-tag-clickable' : ''}`}
                        onClick={
                            clickable
                                ? (event) => {
                                      event.stopPropagation();
                                      onDepFieldClick?.(depName);
                                  }
                                : undefined
                        }
                    >
                        {clickable ? `[${depName}]` : tag}
                    </Tag>
                );
            })}
        </Space>
    );
}

function renderSqlSummaryCell(record: ParamFieldRule, onViewSql: (rule: ParamFieldRule) => void) {
    return (
        <Space size={4}>
            <Typography.Text className="text-xs" ellipsis>
                {buildSqlSummary(record.datasource.sql)}
            </Typography.Text>
            <Button
                type="link"
                size="small"
                className="px-0 h-auto shrink-0"
                onClick={() => onViewSql(record)}
            >
                查看
            </Button>
        </Space>
    );
}

function buildRuleColumns({
    onEditRule,
    onToggleEnabled,
    onDeleteRule,
    onDepFieldClick,
    onViewSql,
}: {
    onEditRule: (rule: ParamFieldRule) => void;
    onToggleEnabled: (rule: ParamFieldRule, enabled: boolean) => void;
    onDeleteRule: (ruleId: string) => void;
    onDepFieldClick?: (fieldName: string) => void;
    onViewSql: (rule: ParamFieldRule) => void;
}): ColumnsType<ParamFieldRule> {
    return [
        {
            title: '序号',
            width: 56,
            render: (_, record, index) => renderRankCell(record, index),
        },
        {
            title: '匹配条件',
            ellipsis: true,
            render: (_, record) => renderMatchCell(record, onDepFieldClick),
        },
        {
            title: 'SQL 摘要',
            width: 220,
            ellipsis: true,
            render: (_, record) => renderSqlSummaryCell(record, onViewSql),
        },
        {
            title: '启用',
            width: 72,
            render: (_, record) => (
                <Switch
                    size="small"
                    checked={record.enabled !== false}
                    onChange={(checked) => onToggleEnabled(record, checked)}
                />
            ),
        },
        {
            title: '操作',
            width: 88,
            render: (_, record) => (
                <Space size={4}>
                    <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => onEditRule(record)}
                    />
                    <Popconfirm title="确定删除此规则？" onConfirm={() => onDeleteRule(record.id)}>
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];
}

export default function ParamSuggestRuleTable({
    fieldLabel,
    rules,
    onEditRule,
    onToggleEnabled,
    onDeleteRule,
    onDepFieldClick,
}: ParamSuggestRuleTableProps) {
    const [sqlDrawerRule, setSqlDrawerRule] = useState<ParamFieldRule | null>(null);

    const columns = useMemo(
        () =>
            buildRuleColumns({
                onEditRule,
                onToggleEnabled,
                onDeleteRule,
                onDepFieldClick,
                onViewSql: (rule) => setSqlDrawerRule(rule),
            }),
        [onDeleteRule, onDepFieldClick, onEditRule, onToggleEnabled],
    );

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
        <>
            <Table
                size="small"
                rowKey="id"
                pagination={false}
                dataSource={rules}
                columns={columns}
                className="param-suggest-rule-table"
                rowClassName={(record) =>
                    record.enabled === false ? 'param-suggest-rule-row-disabled' : ''
                }
                expandable={{
                    expandedRowRender: (record) => (
                        <div className="param-suggest-rule-expanded">
                            <div className="param-suggest-rule-expanded-row">
                                <span className="param-suggest-rule-expanded-label">分层</span>
                                <Tag color={getRuleTierColor(getRuleMatchTier(record))}>
                                    {formatRuleTierLabel(getRuleMatchTier(record))}
                                </Tag>
                            </div>
                            <div className="param-suggest-rule-expanded-row">
                                <span className="param-suggest-rule-expanded-label">优先级</span>
                                <span>{record.priority ?? 0}</span>
                            </div>
                            <div className="param-suggest-rule-expanded-row">
                                <span className="param-suggest-rule-expanded-label">SQL 依赖</span>
                                {renderDepTags(record, onDepFieldClick)}
                            </div>
                            <div className="param-suggest-rule-expanded-row">
                                <span className="param-suggest-rule-expanded-label">完整 SQL</span>
                                <Button
                                    type="link"
                                    size="small"
                                    className="px-0 h-auto"
                                    onClick={() => setSqlDrawerRule(record)}
                                >
                                    查看
                                </Button>
                            </div>
                        </div>
                    ),
                    rowExpandable: () => true,
                }}
            />
            <ParamSuggestSqlDrawer
                open={sqlDrawerRule != null}
                sql={sqlDrawerRule?.datasource.sql ?? ''}
                onClose={() => setSqlDrawerRule(null)}
            />
        </>
    );
}
