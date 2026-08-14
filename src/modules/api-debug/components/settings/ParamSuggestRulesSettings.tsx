import { Button, Input, Modal, Space, Typography } from 'antd';
import { ExportOutlined, ImportOutlined, PlusOutlined } from '@ant-design/icons';
import SettingsConfigPath from '../../../../components/layout/SettingsConfigPath';
import { useParamSuggestRulesSettings } from '../../hooks/useParamSuggestRulesSettings';
import { PARAM_SUGGEST_RULES_FILE } from '../../constants/paramSuggest';
import ParamSuggestFieldSidebar from './ParamSuggestFieldSidebar';
import ParamSuggestRuleTable from './ParamSuggestRuleTable';
import ParamSuggestRuleTestPanel from './ParamSuggestRuleTestPanel';
import ParamSuggestSqlDrawer from './ParamSuggestSqlDrawer';
import ParamSuggestRuleFormModal from './ParamSuggestRuleFormModal';

export default function ParamSuggestRulesSettings() {
    const {
        ruleForm,
        ruleModalOpen,
        setRuleModalOpen,
        importModalOpen,
        setImportModalOpen,
        importText,
        setImportText,
        editingRuleId,
        editingRule,
        presetField,
        createMode,
        testField,
        setTestField,
        testContext,
        setTestContext,
        testKeyword,
        setTestKeyword,
        testRunning,
        testResponse,
        fieldSearch,
        setFieldSearch,
        sqlDrawer,
        setSqlDrawer,
        selectedFieldKey,
        dbConfig,
        rules,
        fieldGroups,
        activeGroup,
        testResolvedRule,
        handleSelectField,
        handleDepFieldClick,
        openCreateRule,
        openEditRule,
        handleSaveRule,
        handleToggleEnabled,
        handleDeleteRule,
        handleExportRules,
        handleImportRules,
        handleRunTest,
    } = useParamSuggestRulesSettings();

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
