import { useMemo } from 'react';
import { Button, Input, Space, Tag, Tooltip, Typography } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import type { DbSuggestResponse, ParamFieldRule } from '../../types/paramSuggest';
import { formatExecutedSqlPreview } from '../../utils/suggest/paramSuggestSql';
import {
    explainRuleMatchReasons,
    getRuleRankInField,
} from '../../utils/suggest/paramSuggestRuleDisplay';
import { formatRuleFields } from '../../utils/suggest/paramSuggestResolve';
import { parseContextParams } from '../../utils/suggest/paramSuggestRuleForm';
import ParamSuggestOptionsPreview from './ParamSuggestOptionsPreview';

interface ParamSuggestRuleTestPanelProps {
    rules: ParamFieldRule[];
    testField: string;
    testContext: string;
    testKeyword: string;
    testRunning: boolean;
    testResponse: DbSuggestResponse | null;
    testResolvedRule?: ParamFieldRule;
    onTestFieldChange: (value: string) => void;
    onTestContextChange: (value: string) => void;
    onTestKeywordChange: (value: string) => void;
    onRunTest: () => void;
    onViewSql?: (sql: string, boundParams?: Record<string, string | number>) => void;
}

export default function ParamSuggestRuleTestPanel({
    rules,
    testField,
    testContext,
    testKeyword,
    testRunning,
    testResponse,
    testResolvedRule,
    onTestFieldChange,
    onTestContextChange,
    onTestKeywordChange,
    onRunTest,
    onViewSql,
}: ParamSuggestRuleTestPanelProps) {
    const contextParams = useMemo(() => parseContextParams(testContext), [testContext]);

    const matchReasons = useMemo(() => {
        if (!testResolvedRule) return [];
        return explainRuleMatchReasons(testResolvedRule, contextParams);
    }, [testResolvedRule, contextParams]);

    const matchedRank = useMemo(() => {
        if (!testResolvedRule || !testField.trim()) return undefined;
        return getRuleRankInField(rules, testField.trim(), testResolvedRule.id);
    }, [rules, testField, testResolvedRule]);

    return (
        <div className="settings-panel-group mt-6 param-suggest-test-panel">
            <Typography.Text strong>规则测试</Typography.Text>
            <Typography.Paragraph type="secondary" className="text-xs mt-1 mb-3">
                模拟入参上下文，预览命中规则并执行 SQL。
            </Typography.Paragraph>

            <div className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-3 items-center">
                <Typography.Text className="text-xs text-[var(--color-text-secondary)]">
                    测试字段
                </Typography.Text>
                <Input
                    placeholder="如 stkcode"
                    value={testField}
                    onChange={(event) => onTestFieldChange(event.target.value)}
                />

                <Typography.Text className="text-xs text-[var(--color-text-secondary)] self-start pt-1">
                    上下文
                </Typography.Text>
                <Input.TextArea
                    rows={4}
                    placeholder={'market=1\nsecuid=123'}
                    value={testContext}
                    onChange={(event) => onTestContextChange(event.target.value)}
                />

                <Typography.Text className="text-xs text-[var(--color-text-secondary)]">
                    关键字
                </Typography.Text>
                <Input
                    placeholder="可选，本地过滤"
                    value={testKeyword}
                    onChange={(event) => onTestKeywordChange(event.target.value)}
                />
            </div>

            {testField.trim() ? (
                <div className="param-suggest-test-preview mt-3">
                    <Typography.Text type="secondary" className="text-xs shrink-0">
                        预计命中：
                    </Typography.Text>
                    {testResolvedRule ? (
                        <Tooltip title={`规则 ID: ${testResolvedRule.id}`}>
                            <Typography.Text className="text-xs">
                                {matchedRank ? `#${matchedRank} ` : ''}
                                {formatRuleFields(testResolvedRule)}
                            </Typography.Text>
                        </Tooltip>
                    ) : (
                        <Typography.Text type="warning" className="text-xs">
                            当前场景无可用规则
                        </Typography.Text>
                    )}
                </div>
            ) : null}

            <Button
                className="mt-3"
                type="primary"
                icon={<ThunderboltOutlined />}
                loading={testRunning}
                onClick={onRunTest}
            >
                开始测试
            </Button>

            {testResponse ? (
                <div className="param-suggest-test-result-card mt-3">
                    {testResolvedRule ? (
                        <div className="param-suggest-test-result-section">
                            <Typography.Text strong className="text-xs">
                                命中规则
                            </Typography.Text>
                            <div className="text-xs mt-1">
                                {matchedRank ? `#${matchedRank} ` : ''}
                                {formatRuleFields(testResolvedRule)}
                            </div>
                        </div>
                    ) : null}

                    {matchReasons.length > 0 ? (
                        <div className="param-suggest-test-result-section">
                            <Typography.Text strong className="text-xs">
                                命中原因
                            </Typography.Text>
                            <Space size={[4, 4]} wrap className="mt-1">
                                {matchReasons.map((reason) => (
                                    <Tag key={reason} className="param-suggest-match-tag">
                                        {reason}
                                    </Tag>
                                ))}
                            </Space>
                        </div>
                    ) : null}

                    {testResponse.executedSql ? (
                        <div className="param-suggest-test-result-section">
                            <div className="flex items-center justify-between gap-2">
                                <Typography.Text strong className="text-xs">
                                    执行 SQL
                                </Typography.Text>
                                {onViewSql ? (
                                    <Button
                                        type="link"
                                        size="small"
                                        className="px-0 h-auto"
                                        onClick={() =>
                                            onViewSql(
                                                testResponse.executedSql ?? '',
                                                testResponse.boundParams,
                                            )
                                        }
                                    >
                                        查看
                                    </Button>
                                ) : null}
                            </div>
                            <pre className="param-suggest-test-sql-preview mt-1">
                                {formatExecutedSqlPreview(
                                    testResponse.executedSql,
                                    testResponse.boundParams,
                                )}
                            </pre>
                        </div>
                    ) : null}

                    <div className="param-suggest-test-result-meta">
                        {testResponse.error ? (
                            <Typography.Text type="danger" className="text-xs">
                                错误：{testResponse.error}
                            </Typography.Text>
                        ) : testResponse.pendingDeps && testResponse.pendingDeps.length > 0 ? (
                            <Typography.Text type="warning" className="text-xs">
                                缺少依赖参数：{testResponse.pendingDeps.join(', ')}
                            </Typography.Text>
                        ) : (
                            <Typography.Text className="text-xs">
                                返回记录：{testResponse.options.length}
                                {testResponse.fromCache ? '（缓存）' : ''}
                            </Typography.Text>
                        )}
                        {testResponse.elapsedMs != null ? (
                            <Typography.Text type="secondary" className="text-xs">
                                耗时：{testResponse.elapsedMs}ms
                            </Typography.Text>
                        ) : null}
                    </div>

                    {testResponse.options.length > 0 && !testResponse.error ? (
                        <ParamSuggestOptionsPreview options={testResponse.options} />
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
