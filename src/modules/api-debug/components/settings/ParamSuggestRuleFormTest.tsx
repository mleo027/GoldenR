import { useState } from 'react';
import { App, Button, Typography } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import type { DbSuggestResponse } from '../../types/paramSuggest';
import { fetchParamSuggestions } from '../../services/paramSuggestService';
import { formatExecutedSqlPreview } from '../../utils/suggest/paramSuggestSql';
import {
    formValuesToRule,
    parseContextParams,
    type RuleFormValues,
} from '../../utils/suggest/paramSuggestRuleForm';
import { parseRuleFields } from '../../utils/suggest/paramSuggestResolve';
import ParamSuggestOptionsPreview from './ParamSuggestOptionsPreview';
import { TextArea } from '../../../../components/ui/primitives';

interface ParamSuggestRuleFormTestProps {
    formValues: RuleFormValues;
    editingRuleId: string | null;
    onViewSql?: (sql: string, boundParams?: Record<string, string | number>) => void;
}

function RuleTestResult({
    response,
    onViewSql,
}: {
    response: DbSuggestResponse;
    onViewSql?: (sql: string, boundParams?: Record<string, string | number>) => void;
}) {
    return (
        <div className="param-suggest-test-result-card mt-3">
            {response.executedSql ? (
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
                                    onViewSql(response.executedSql ?? '', response.boundParams)
                                }
                            >
                                查看
                            </Button>
                        ) : null}
                    </div>
                    <pre className="param-suggest-test-sql-preview mt-1">
                        {formatExecutedSqlPreview(response.executedSql, response.boundParams)}
                    </pre>
                </div>
            ) : null}

            <div className="param-suggest-test-result-meta">
                {response.error ? (
                    <Typography.Text type="danger" className="text-xs">
                        错误：{response.error}
                    </Typography.Text>
                ) : response.pendingDeps && response.pendingDeps.length > 0 ? (
                    <Typography.Text type="warning" className="text-xs">
                        缺少依赖参数：{response.pendingDeps.join(', ')}
                    </Typography.Text>
                ) : (
                    <Typography.Text className="text-xs">
                        返回记录：{response.options.length}
                    </Typography.Text>
                )}
                {response.elapsedMs != null ? (
                    <Typography.Text type="secondary" className="text-xs">
                        耗时：{response.elapsedMs}ms
                    </Typography.Text>
                ) : null}
            </div>

            {response.options.length > 0 ? (
                <ParamSuggestOptionsPreview options={response.options} />
            ) : null}
        </div>
    );
}

export default function ParamSuggestRuleFormTest({
    formValues,
    editingRuleId,
    onViewSql,
}: ParamSuggestRuleFormTestProps) {
    const { message } = App.useApp();
    const [testContext, setTestContext] = useState('market=1\norgid=100');
    const [testRunning, setTestRunning] = useState(false);
    const [testResponse, setTestResponse] = useState<DbSuggestResponse | null>(null);

    const handleRunTest = async () => {
        const fields = parseRuleFields(formValues.field);
        if (fields.length === 0) {
            message.warning('请先填写适用字段');
            return;
        }

        const contextParams = parseContextParams(testContext);
        const draft = formValuesToRule(formValues, editingRuleId ?? undefined);
        const testField = fields[0];

        setTestRunning(true);
        setTestResponse(null);
        try {
            const response = await fetchParamSuggestions({
                field: testField,
                testField,
                contextParams,
                ruleOverride: draft,
            });
            setTestResponse(response);
        } catch (error) {
            setTestResponse({
                options: [],
                error: error instanceof Error ? error.message : String(error),
            });
        } finally {
            setTestRunning(false);
        }
    };

    return (
        <div className="param-suggest-form-test">
            <Typography.Text strong className="param-suggest-form-section">
                规则测试
            </Typography.Text>
            <Typography.Paragraph type="secondary" className="text-xs mt-0 mb-2">
                使用当前表单内容直跑 SQL，无需先保存。
            </Typography.Paragraph>
            <Typography.Text className="text-xs text-[var(--color-text-secondary)] block mb-1">
                输入参数（key=value，逗号/换行分隔）
            </Typography.Text>
            <TextArea
                rows={3}
                value={testContext}
                placeholder={'market=1\norgid=100'}
                onChange={(event) => setTestContext(event.target.value)}
            />
            <Button
                className="mt-2"
                type="primary"
                size="small"
                icon={<ThunderboltOutlined />}
                loading={testRunning}
                onClick={() => void handleRunTest()}
            >
                执行测试
            </Button>

            {testResponse ? <RuleTestResult response={testResponse} onViewSql={onViewSql} /> : null}
        </div>
    );
}
