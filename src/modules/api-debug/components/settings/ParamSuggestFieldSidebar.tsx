import { Button, Input, Tooltip, Typography } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import type { RuleFieldGroup } from '../../utils/suggest/paramSuggestResolve';
import { summarizeFieldGroup } from '../../utils/suggest/paramSuggestResolve';
import type { FieldHealth } from '../../utils/suggest/paramSuggestRuleDisplay';
import { summarizeFieldHealth } from '../../utils/suggest/paramSuggestRuleDisplay';

interface ParamSuggestFieldSidebarProps {
    groups: RuleFieldGroup[];
    selectedKey: string | null;
    searchKeyword: string;
    onSearchChange: (value: string) => void;
    onSelect: (fieldKey: string) => void;
    onCreateField: () => void;
}

const HEALTH_LABELS: Record<FieldHealth, string> = {
    ok: '配置正常：有启用规则且含全局兜底',
    'no-enabled': '配置异常：无启用规则',
    'no-fallback': '配置提示：有规则但缺少全局兜底（入参为空时可能无提示）',
};

const HEALTH_MARKS: Record<FieldHealth, string> = {
    ok: '✓',
    'no-enabled': '!',
    'no-fallback': '⚠',
};

export default function ParamSuggestFieldSidebar({
    groups,
    selectedKey,
    searchKeyword,
    onSearchChange,
    onSelect,
    onCreateField,
}: ParamSuggestFieldSidebarProps) {
    return (
        <div className="param-suggest-field-sidebar">
            <div className="param-suggest-field-sidebar-header">
                <Typography.Text strong className="text-sm">
                    字段列表
                </Typography.Text>
                <Button type="link" size="small" icon={<PlusOutlined />} onClick={onCreateField}>
                    新建
                </Button>
            </div>
            <Input
                allowClear
                size="small"
                className="param-suggest-field-search"
                prefix={<SearchOutlined className="text-[var(--color-text-muted)]" />}
                placeholder="搜索字段"
                value={searchKeyword}
                onChange={(event) => onSearchChange(event.target.value)}
            />
            <Typography.Paragraph
                type="secondary"
                className="param-suggest-field-legend text-xs px-2 mb-1"
            >
                配置状态（非测试结果）：{' '}
                <Tooltip title={HEALTH_LABELS.ok}>
                    <span className="param-suggest-field-health param-suggest-field-health-ok">
                        ✓
                    </span>
                </Tooltip>{' '}
                正常 ·{' '}
                <Tooltip title={HEALTH_LABELS['no-fallback']}>
                    <span className="param-suggest-field-health param-suggest-field-health-no-fallback">
                        ⚠
                    </span>
                </Tooltip>{' '}
                缺兜底 ·{' '}
                <Tooltip title={HEALTH_LABELS['no-enabled']}>
                    <span className="param-suggest-field-health param-suggest-field-health-no-enabled">
                        !
                    </span>
                </Tooltip>{' '}
                未启用
            </Typography.Paragraph>
            <div className="param-suggest-field-list ui-scroll">
                {groups.length === 0 ? (
                    <Typography.Text type="secondary" className="text-xs px-2 py-3 block">
                        无匹配字段
                    </Typography.Text>
                ) : (
                    groups.map((group) => {
                        const key = group.field.toLowerCase();
                        const health = summarizeFieldHealth(group.rules);
                        const summary = summarizeFieldGroup(group.rules);
                        const active = selectedKey === key;
                        return (
                            <button
                                key={key}
                                type="button"
                                className={`param-suggest-field-item${active ? ' param-suggest-field-item-active' : ''}`}
                                onClick={() => onSelect(key)}
                            >
                                <span className="param-suggest-field-item-name">{group.field}</span>
                                <Tooltip title={HEALTH_LABELS[health]}>
                                    <span
                                        className={`param-suggest-field-health param-suggest-field-health-${health}`}
                                    >
                                        {HEALTH_MARKS[health]}
                                    </span>
                                </Tooltip>
                                <span className="param-suggest-field-item-meta">
                                    {summary.enabled}/{summary.total}
                                </span>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}
