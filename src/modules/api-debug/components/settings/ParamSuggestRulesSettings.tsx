import { Button, Modal, Space, Typography } from 'antd';
import { ExportOutlined, ImportOutlined, PlusOutlined } from '@ant-design/icons';
import SettingsConfigPath from '../../../../components/layout/SettingsConfigPath';
import { useParamSuggestRulesSettings } from '../../hooks/useParamSuggestRulesSettings';
import { PARAM_SUGGEST_RULES_FILE } from '../../constants/paramSuggest';
import type { DbConnectionConfig, ParamFieldRule } from '../../types/paramSuggest';
import ParamSuggestFieldSidebar from './ParamSuggestFieldSidebar';
import ParamSuggestRuleTable from './ParamSuggestRuleTable';
import ParamSuggestRuleTestPanel from './ParamSuggestRuleTestPanel';
import ParamSuggestSqlDrawer from './ParamSuggestSqlDrawer';
import ParamSuggestRuleFormModal from './ParamSuggestRuleFormModal';
import { TextArea } from '../../../../components/ui/primitives';

function RuleManagementToolbar({
    onImport,
    onExport,
    onCreate,
}: {
    onImport: () => void;
    onExport: () => void;
    onCreate: () => void;
}) {
    return (
        <div className="flex items-center justify-between mb-3 gap-3">
            <Typography.Text strong>规则管理</Typography.Text>
            <Space size={8}>
                <Button size="small" icon={<ImportOutlined />} onClick={onImport}>
                    导入
                </Button>
                <Button size="small" icon={<ExportOutlined />} onClick={() => void onExport()}>
                    导出
                </Button>
                <Button type="primary" size="small" icon={<PlusOutlined />} onClick={onCreate}>
                    新建字段
                </Button>
            </Space>
        </div>
    );
}

function ActiveRuleWorkspace({
    activeGroup,
    onOpenCreateRule,
    onEditRule,
    onToggleEnabled,
    onDeleteRule,
    onDepFieldClick,
}: {
    activeGroup: { field: string; rules: ParamFieldRule[] } | null | undefined;
    onOpenCreateRule: (field?: string) => void;
    onEditRule: (rule: ParamFieldRule) => void;
    onToggleEnabled: (rule: ParamFieldRule, enabled: boolean) => void;
    onDeleteRule: (ruleId: string) => void;
    onDepFieldClick?: (fieldName: string) => void;
}) {
    if (!activeGroup) {
        return (
            <div className="param-suggest-rule-empty">
                <Typography.Text type="secondary">
                    请从左侧选择字段，或新建字段开始配置
                </Typography.Text>
            </div>
        );
    }
    return (
        <>
            <div className="param-suggest-workspace-header">
                <div>
                    <Typography.Text strong>{activeGroup.field}</Typography.Text>
                    <Typography.Text type="secondary" className="text-xs ml-2">
                        {activeGroup.rules.length} 条规则
                    </Typography.Text>
                </div>
                <Button
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => onOpenCreateRule(activeGroup.field)}
                >
                    添加规则
                </Button>
            </div>
            <ParamSuggestRuleTable
                fieldLabel={activeGroup.field}
                rules={activeGroup.rules}
                onEditRule={onEditRule}
                onToggleEnabled={onToggleEnabled}
                onDeleteRule={onDeleteRule}
                onDepFieldClick={onDepFieldClick}
            />
        </>
    );
}

function ImportRulesModal({
    open,
    onCancel,
    onOk,
    value,
    onChange,
}: {
    open: boolean;
    onCancel: () => void;
    onOk: () => void;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <Modal
            open={open}
            title="导入规则 JSON"
            centered
            destroyOnClose
            className="app-modal"
            onCancel={onCancel}
            onOk={onOk}
            okText="导入"
        >
            <Typography.Paragraph type="secondary" className="text-xs">
                请粘贴 <code>{`{ "rules": [ ... ] }`}</code> 格式的规则 JSON，导入后会覆盖当前规则。
            </Typography.Paragraph>
            <TextArea
                rows={12}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={
                    '{\n  "rules": [\n    {\n      "field": "bsflag",\n      "type": "select",\n      "datasource": { "type": "sql", "db": "mssql", "sql": "select ..." }\n    }\n  ]\n}'
                }
            />
        </Modal>
    );
}

function RulesSettingsIntro({ dbConfig }: { dbConfig: DbConnectionConfig }) {
    return (
        <>
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
        </>
    );
}

function RulesSettingsWorkspace({
    settings,
}: {
    settings: ReturnType<typeof useParamSuggestRulesSettings>;
}) {
    return (
        <div className="settings-panel-group">
            <RuleManagementToolbar
                onImport={() => settings.setImportModalOpen(true)}
                onExport={settings.handleExportRules}
                onCreate={() => settings.openCreateRule()}
            />
            <div className="param-suggest-layout">
                <ParamSuggestFieldSidebar
                    groups={settings.fieldGroups}
                    selectedKey={settings.selectedFieldKey}
                    searchKeyword={settings.fieldSearch}
                    onSearchChange={settings.setFieldSearch}
                    onSelect={settings.handleSelectField}
                    onCreateField={() => settings.openCreateRule()}
                />
                <div className="param-suggest-workspace">
                    <ActiveRuleWorkspace
                        activeGroup={settings.activeGroup}
                        onOpenCreateRule={settings.openCreateRule}
                        onEditRule={settings.openEditRule}
                        onToggleEnabled={(rule, enabled) =>
                            void settings.handleToggleEnabled(rule, enabled)
                        }
                        onDeleteRule={(ruleId) => void settings.handleDeleteRule(ruleId)}
                        onDepFieldClick={settings.handleDepFieldClick}
                    />
                    <ParamSuggestRuleTestPanel
                        rules={settings.rules}
                        testField={settings.testField}
                        testContext={settings.testContext}
                        testKeyword={settings.testKeyword}
                        testRunning={settings.testRunning}
                        testResponse={settings.testResponse}
                        testResolvedRule={settings.testResolvedRule}
                        onTestFieldChange={settings.setTestField}
                        onTestContextChange={settings.setTestContext}
                        onTestKeywordChange={settings.setTestKeyword}
                        onRunTest={() => void settings.handleRunTest()}
                        onViewSql={(sql, boundParams) =>
                            settings.setSqlDrawer({ sql, boundParams })
                        }
                    />
                </div>
            </div>
        </div>
    );
}

export default function ParamSuggestRulesSettings() {
    const settings = useParamSuggestRulesSettings();

    return (
        <div className="settings-panel">
            <RulesSettingsIntro dbConfig={settings.dbConfig} />
            <RulesSettingsWorkspace settings={settings} />

            <ParamSuggestSqlDrawer
                open={settings.sqlDrawer != null}
                sql={settings.sqlDrawer?.sql ?? ''}
                boundParams={settings.sqlDrawer?.boundParams}
                onClose={() => settings.setSqlDrawer(null)}
            />

            <ParamSuggestRuleFormModal
                open={settings.ruleModalOpen}
                editingRuleId={settings.editingRuleId}
                createMode={settings.createMode}
                initialRule={settings.editingRule}
                presetField={settings.presetField}
                form={settings.ruleForm}
                onCancel={() => settings.setRuleModalOpen(false)}
                onSave={settings.handleSaveRule}
                onViewSql={(sql, boundParams) => settings.setSqlDrawer({ sql, boundParams })}
            />

            <ImportRulesModal
                open={settings.importModalOpen}
                onCancel={() => settings.setImportModalOpen(false)}
                onOk={() => void settings.handleImportRules()}
                value={settings.importText}
                onChange={settings.setImportText}
            />
        </div>
    );
}
