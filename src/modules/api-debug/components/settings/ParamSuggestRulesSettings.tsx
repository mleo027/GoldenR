import { useCallback, useEffect, useMemo, useState } from 'react';
import { App, Button, Form, Input, Modal, Space, Typography } from 'antd';
import { ExportOutlined, ImportOutlined, PlusOutlined } from '@ant-design/icons';
import SettingsConfigPath from '../../../../components/layout/SettingsConfigPath';
import type {
    DbSuggestResponse,
    ParamFieldRule,
    ParamSuggestRulesFile,
} from '../../types/paramSuggest';
import {
    groupRulesByField,
    normalizeParamFieldRules,
    resolveSuggestRule,
} from '../../utils/suggest/paramSuggestResolve';
import { validateSelectSql } from '../../utils/suggest/paramSuggestSql';
import {
    EMPTY_RULE_FORM,
    formValuesToRule,
    parseContextParams,
    type RuleFormValues,
} from '../../utils/suggest/paramSuggestRuleForm';
import { fetchParamSuggestions } from '../../services/paramSuggestService';
import { useParamSuggest } from '../../store/useParamSuggest';
import { PARAM_SUGGEST_RULES_FILE } from '../../constants/paramSuggest';
import { filterRulesByFieldSearch } from '../../utils/suggest/paramSuggestRuleDisplay';
import ParamSuggestFieldSidebar from './ParamSuggestFieldSidebar';
import ParamSuggestRuleTable from './ParamSuggestRuleTable';
import ParamSuggestRuleTestPanel from './ParamSuggestRuleTestPanel';
import ParamSuggestSqlDrawer from './ParamSuggestSqlDrawer';
import ParamSuggestRuleFormModal from './ParamSuggestRuleFormModal';

function isParamSuggestRulesFile(value: unknown): value is ParamSuggestRulesFile {
    return Boolean(
        value && typeof value === 'object' && Array.isArray((value as ParamSuggestRulesFile).rules),
    );
}

export default function ParamSuggestRulesSettings() {
    const { message } = App.useApp();
    const { dbConfig, rules, syncRulesToMain, reloadMainConfig } = useParamSuggest();
    const [ruleForm] = Form.useForm<RuleFormValues>();
    const [ruleModalOpen, setRuleModalOpen] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [importText, setImportText] = useState('');
    const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
    const [editingRule, setEditingRule] = useState<ParamFieldRule | undefined>();
    const [presetField, setPresetField] = useState<string | undefined>();
    const [testField, setTestField] = useState('');
    const [testContext, setTestContext] = useState('');
    const [testKeyword, setTestKeyword] = useState('');
    const [testRunning, setTestRunning] = useState(false);
    const [testResponse, setTestResponse] = useState<DbSuggestResponse | null>(null);
    const [fieldSearch, setFieldSearch] = useState('');
    const [createMode, setCreateMode] = useState<'field' | 'rule'>('field');
    const [sqlDrawer, setSqlDrawer] = useState<{
        sql: string;
        boundParams?: Record<string, string | number>;
    } | null>(null);
    const [selectedFieldKey, setSelectedFieldKey] = useState<string | null>(null);

    const filteredRules = useMemo(
        () => filterRulesByFieldSearch(rules, fieldSearch),
        [rules, fieldSearch],
    );

    const fieldGroups = useMemo(() => groupRulesByField(filteredRules), [filteredRules]);

    const activeGroup = useMemo(
        () => fieldGroups.find((group) => group.field.toLowerCase() === selectedFieldKey) ?? null,
        [fieldGroups, selectedFieldKey],
    );

    useEffect(() => {
        if (fieldGroups.length === 0) {
            setSelectedFieldKey(null);
            return;
        }
        if (
            !selectedFieldKey ||
            !fieldGroups.some((group) => group.field.toLowerCase() === selectedFieldKey)
        ) {
            setSelectedFieldKey(fieldGroups[0].field.toLowerCase());
        }
    }, [fieldGroups, selectedFieldKey]);

    const handleSelectField = useCallback(
        (fieldKey: string) => {
            setSelectedFieldKey(fieldKey);
            const group = fieldGroups.find((item) => item.field.toLowerCase() === fieldKey);
            if (group && !group.field.includes(',')) {
                setTestField(group.field);
            }
        },
        [fieldGroups],
    );

    const handleDepFieldClick = useCallback(
        (depName: string) => {
            const target = fieldGroups.find(
                (group) => group.field.toLowerCase() === depName.toLowerCase(),
            );
            if (target) {
                handleSelectField(target.field.toLowerCase());
                return;
            }
            setFieldSearch(depName);
            setTestField(depName);
        },
        [fieldGroups, handleSelectField],
    );

    const openCreateRule = useCallback(
        (nextPresetField?: string) => {
            setEditingRuleId(null);
            setEditingRule(undefined);
            setPresetField(nextPresetField);
            setCreateMode(nextPresetField ? 'rule' : 'field');
            ruleForm.setFieldsValue({
                ...EMPTY_RULE_FORM,
                field: nextPresetField ?? '',
            });
            setRuleModalOpen(true);
        },
        [ruleForm],
    );

    const openEditRule = useCallback((rule: ParamFieldRule) => {
        setEditingRuleId(rule.id);
        setEditingRule(rule);
        setPresetField(undefined);
        setCreateMode('rule');
        setRuleModalOpen(true);
    }, []);

    const handleSaveRule = useCallback(
        async (values: RuleFormValues, ruleId: string) => {
            const sqlCheck = validateSelectSql(values.sql);
            if (!sqlCheck.ok) {
                message.error(sqlCheck.reason);
                throw new Error(sqlCheck.reason);
            }

            const rule = formValuesToRule(values, ruleId);
            const nextRules = editingRuleId
                ? rules.map((item) => (item.id === editingRuleId ? rule : item))
                : [...rules, rule];

            try {
                await syncRulesToMain(nextRules);
            } catch (error) {
                const text = error instanceof Error ? error.message : String(error);
                message.error(text || '保存失败');
                throw error;
            }
            setRuleModalOpen(false);
            message.success(editingRuleId ? '已更新规则' : '已添加规则');
        },
        [rules, syncRulesToMain, editingRuleId, message],
    );

    const handleToggleEnabled = useCallback(
        async (rule: ParamFieldRule, enabled: boolean) => {
            const nextRules = rules.map((item) =>
                item.id === rule.id ? { ...item, enabled } : item,
            );
            await syncRulesToMain(nextRules);
        },
        [rules, syncRulesToMain],
    );

    const handleDeleteRule = useCallback(
        async (ruleId: string) => {
            await syncRulesToMain(rules.filter((item) => item.id !== ruleId));
        },
        [rules, syncRulesToMain],
    );

    const handleExportRules = useCallback(async () => {
        const payload: ParamSuggestRulesFile = { rules };
        const text = JSON.stringify(payload, null, 2);
        if (window.electronAPI) {
            await window.electronAPI.writeJsonFile('param-suggest-rules.json', payload);
            message.success('已导出到 param-suggest-rules.json');
            return;
        }
        await navigator.clipboard.writeText(text);
        message.success('规则 JSON 已复制到剪贴板');
    }, [rules, message]);

    const handleImportRules = useCallback(async () => {
        let parsed: unknown;
        try {
            parsed = JSON.parse(importText);
        } catch {
            message.error('JSON 格式无效');
            return;
        }

        const importedRules = Array.isArray(parsed)
            ? parsed
            : isParamSuggestRulesFile(parsed)
              ? parsed.rules
              : null;

        if (!importedRules || !Array.isArray(importedRules)) {
            message.error('需包含 rules 数组或 { "rules": [...] } 格式');
            return;
        }

        const validRules = importedRules.filter((item): item is ParamFieldRule =>
            Boolean(
                item &&
                typeof item === 'object' &&
                typeof (item as ParamFieldRule).field === 'string' &&
                (item as ParamFieldRule).type === 'select' &&
                (item as ParamFieldRule).datasource?.sql,
            ),
        );

        if (validRules.length === 0) {
            message.error('没有有效的规则');
            return;
        }

        await syncRulesToMain(normalizeParamFieldRules(validRules));
        setImportModalOpen(false);
        setImportText('');
        message.success(`已导入 ${validRules.length} 条规则`);
    }, [importText, syncRulesToMain, message]);

    const testResolvedRule = useMemo(() => {
        if (!testField.trim()) return undefined;
        return resolveSuggestRule(rules, {
            field: testField.trim(),
            contextParams: parseContextParams(testContext),
        });
    }, [rules, testField, testContext]);

    const handleRunTest = useCallback(async () => {
        if (!testField.trim()) {
            message.warning('请先填写测试字段');
            return;
        }

        setTestRunning(true);
        setTestResponse(null);
        try {
            await reloadMainConfig();
            const response = await fetchParamSuggestions({
                field: testField.trim(),
                contextParams: parseContextParams(testContext),
                keyword: testKeyword.trim() || undefined,
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
    }, [testField, testContext, testKeyword, message, reloadMainConfig]);

    return (
        <div className="settings-panel">
            <Typography.Title level={5} className="settings-panel-title">
                入参提示规则
            </Typography.Title>
            <Typography.Paragraph type="secondary" className="settings-panel-desc">
                为参数字段配置 SQL 下拉建议。同一字段可配多条规则，按依赖入参数量 → SQL 占位符 →{' '}
                <code>priority</code> 顺序命中；若靠前规则查询成功但无数据，会继续尝试下一条；SQL
                需含 <code>value</code>，可选 <code>remark</code> 列。
            </Typography.Paragraph>
            <SettingsConfigPath fileName={PARAM_SUGGEST_RULES_FILE} label="规则配置保存在" />

            {dbConfig.database ? (
                <Typography.Paragraph type="secondary" className="text-xs mb-4">
                    当前库：{dbConfig.server}
                    {dbConfig.port ? `:${dbConfig.port}` : ''} / {dbConfig.database}
                </Typography.Paragraph>
            ) : (
                <Typography.Paragraph type="warning" className="text-xs mb-4">
                    请先在「数据库」面板配置 SQL Server 连接
                </Typography.Paragraph>
            )}

            <div className="settings-panel-group">
                <div className="flex items-center justify-between mb-3 gap-3">
                    <Typography.Text strong>规则管理</Typography.Text>
                    <Space size={8}>
                        <Button
                            size="small"
                            icon={<ImportOutlined />}
                            onClick={() => setImportModalOpen(true)}
                        >
                            导入
                        </Button>
                        <Button
                            size="small"
                            icon={<ExportOutlined />}
                            onClick={() => void handleExportRules()}
                        >
                            导出
                        </Button>
                        <Button
                            type="primary"
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={() => openCreateRule()}
                        >
                            新建字段
                        </Button>
                    </Space>
                </div>

                <div className="param-suggest-layout">
                    <ParamSuggestFieldSidebar
                        groups={fieldGroups}
                        selectedKey={selectedFieldKey}
                        searchKeyword={fieldSearch}
                        onSearchChange={setFieldSearch}
                        onSelect={handleSelectField}
                        onCreateField={() => openCreateRule()}
                    />
                    <div className="param-suggest-workspace">
                        {activeGroup ? (
                            <>
                                <div className="param-suggest-workspace-header">
                                    <div>
                                        <Typography.Text strong>
                                            {activeGroup.field}
                                        </Typography.Text>
                                        <Typography.Text type="secondary" className="text-xs ml-2">
                                            {activeGroup.rules.length} 条规则
                                        </Typography.Text>
                                    </div>
                                    <Button
                                        size="small"
                                        icon={<PlusOutlined />}
                                        onClick={() => openCreateRule(activeGroup.field)}
                                    >
                                        添加规则
                                    </Button>
                                </div>
                                <ParamSuggestRuleTable
                                    fieldLabel={activeGroup.field}
                                    rules={activeGroup.rules}
                                    onEditRule={openEditRule}
                                    onToggleEnabled={(rule, enabled) =>
                                        void handleToggleEnabled(rule, enabled)
                                    }
                                    onDeleteRule={(ruleId) => void handleDeleteRule(ruleId)}
                                    onDepFieldClick={handleDepFieldClick}
                                />
                            </>
                        ) : (
                            <div className="param-suggest-rule-empty">
                                <Typography.Text type="secondary">
                                    请从左侧选择字段，或新建字段开始配置
                                </Typography.Text>
                            </div>
                        )}

                        <ParamSuggestRuleTestPanel
                            rules={rules}
                            testField={testField}
                            testContext={testContext}
                            testKeyword={testKeyword}
                            testRunning={testRunning}
                            testResponse={testResponse}
                            testResolvedRule={testResolvedRule}
                            onTestFieldChange={setTestField}
                            onTestContextChange={setTestContext}
                            onTestKeywordChange={setTestKeyword}
                            onRunTest={() => void handleRunTest()}
                            onViewSql={(sql, boundParams) => setSqlDrawer({ sql, boundParams })}
                        />
                    </div>
                </div>
            </div>

            <ParamSuggestSqlDrawer
                open={sqlDrawer != null}
                sql={sqlDrawer?.sql ?? ''}
                boundParams={sqlDrawer?.boundParams}
                onClose={() => setSqlDrawer(null)}
            />

            <ParamSuggestRuleFormModal
                open={ruleModalOpen}
                editingRuleId={editingRuleId}
                createMode={createMode}
                initialRule={editingRule}
                presetField={presetField}
                form={ruleForm}
                onCancel={() => setRuleModalOpen(false)}
                onSave={handleSaveRule}
                onViewSql={(sql, boundParams) => setSqlDrawer({ sql, boundParams })}
            />

            <Modal
                open={importModalOpen}
                title="导入规则 JSON"
                centered
                destroyOnClose
                className="app-modal"
                onCancel={() => setImportModalOpen(false)}
                onOk={() => void handleImportRules()}
                okText="导入"
            >
                <Typography.Paragraph type="secondary" className="text-xs">
                    请粘贴 <code>{`{ "rules": [ ... ] }`}</code> 格式的规则
                    JSON，导入后会覆盖当前规则。
                </Typography.Paragraph>
                <Input.TextArea
                    rows={12}
                    value={importText}
                    onChange={(event) => setImportText(event.target.value)}
                    placeholder={
                        '{\n  "rules": [\n    {\n      "field": "bsflag",\n      "type": "select",\n      "datasource": { "type": "sql", "db": "mssql", "sql": "select ..." }\n    }\n  ]\n}'
                    }
                />
            </Modal>
        </div>
    );
}
