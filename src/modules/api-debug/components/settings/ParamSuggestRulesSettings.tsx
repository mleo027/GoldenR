import type { ReactNode } from 'react';
import { Button, Modal, Space, Typography } from 'antd';
import { ExportOutlined, ImportOutlined, PlusOutlined } from '@ant-design/icons';
import { useParamSuggestRulesSettings } from '../../hooks/useParamSuggestRulesSettings';
import type { DbConnectionConfig, ParamFieldRule } from '../../types/paramSuggest';
import ParamSuggestFieldSidebar from './ParamSuggestFieldSidebar';
import ParamSuggestRuleTable from './ParamSuggestRuleTable';
import ParamSuggestSqlDrawer from './ParamSuggestSqlDrawer';
import ParamSuggestRuleEditor from './ParamSuggestRuleFormModal';
import { TextArea } from '../../../../components/ui/primitives';

type RulesSettings = ReturnType<typeof useParamSuggestRulesSettings>;

function RuleManagementToolbar({ settings }: { settings: RulesSettings }) {
    return (
        <div className="param-suggest-toolbar">
            <div>
                <Typography.Text strong>规则管理</Typography.Text>
                <Typography.Paragraph type="secondary" className="text-xs mt-1 mb-0">
                    选择字段后逐条展开规则，配置与测试只在当前规则中显示。
                </Typography.Paragraph>
            </div>
            <Space size={8} wrap>
                <Button
                    size="small"
                    icon={<ImportOutlined />}
                    onClick={() => settings.setImportModalOpen(true)}
                >
                    导入
                </Button>
                <Button
                    size="small"
                    icon={<ExportOutlined />}
                    onClick={() => void settings.handleExportRules()}
                >
                    导出
                </Button>
                <Button
                    type="primary"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => settings.openCreateRule()}
                >
                    新建字段
                </Button>
            </Space>
        </div>
    );
}

function RuleEditor({ settings, rule }: { settings: RulesSettings; rule?: ParamFieldRule }) {
    const editingRuleId = rule?.id ?? null;
    return (
        <ParamSuggestRuleEditor
            open={settings.ruleModalOpen && settings.editingRuleId === editingRuleId}
            editingRuleId={editingRuleId}
            createMode={settings.createMode}
            initialRule={rule}
            presetField={settings.presetField}
            form={settings.ruleForm}
            onCancel={() => settings.setRuleModalOpen(false)}
            onSave={settings.handleSaveRule}
            onViewSql={(sql, boundParams) => settings.setSqlDrawer({ sql, boundParams })}
        />
    );
}

function ActiveRuleWorkspace({ settings }: { settings: RulesSettings }) {
    const activeGroup = settings.activeGroup;
    if (!activeGroup) {
        return (
            <div className="param-suggest-rule-empty">
                <Typography.Text type="secondary">
                    请从左侧选择字段，或新建字段开始配置
                </Typography.Text>
            </div>
        );
    }

    const toggleRule = (rule: ParamFieldRule) => {
        if (settings.ruleModalOpen && settings.editingRuleId === rule.id) {
            settings.setRuleModalOpen(false);
            return;
        }
        settings.openEditRule(rule);
    };
    const renderExpanded = (rule: ParamFieldRule): ReactNode => (
        <RuleEditor settings={settings} rule={rule} />
    );

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
                    onClick={() => settings.openCreateRule(activeGroup.field)}
                >
                    添加规则
                </Button>
            </div>
            <ParamSuggestRuleTable
                fieldLabel={activeGroup.field}
                rules={activeGroup.rules}
                expandedRuleId={settings.ruleModalOpen ? settings.editingRuleId : null}
                onToggleExpanded={toggleRule}
                onToggleEnabled={(rule, enabled) =>
                    void settings.handleToggleEnabled(rule, enabled)
                }
                onDeleteRule={(ruleId) => void settings.handleDeleteRule(ruleId)}
                renderExpanded={renderExpanded}
            />
        </>
    );
}

function ImportRulesModal({ settings }: { settings: RulesSettings }) {
    return (
        <Modal
            open={settings.importModalOpen}
            title="导入规则 JSON"
            centered
            destroyOnHidden
            className="app-modal"
            onCancel={() => settings.setImportModalOpen(false)}
            onOk={() => void settings.handleImportRules()}
            okText="导入"
        >
            <Typography.Paragraph type="secondary" className="text-xs">
                请粘贴 <code>{`{ "rules": [ ... ] }`}</code> 格式的规则 JSON，导入后会覆盖当前规则。
            </Typography.Paragraph>
            <TextArea
                rows={12}
                value={settings.importText}
                onChange={(event) => settings.setImportText(event.target.value)}
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
                每条规则独立配置匹配条件、SQL 与缓存策略，并可在保存前直接测试。
            </Typography.Paragraph>
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

export default function ParamSuggestRulesSettings() {
    const settings = useParamSuggestRulesSettings();
    const creatingRule = settings.ruleModalOpen && settings.editingRuleId == null;

    return (
        <div className="settings-panel param-suggest-settings-panel">
            <RulesSettingsIntro dbConfig={settings.dbConfig} />
            <div className="settings-panel-group">
                <RuleManagementToolbar settings={settings} />
                <div className="param-suggest-layout">
                    <ParamSuggestFieldSidebar
                        groups={settings.fieldGroups}
                        selectedKey={settings.selectedFieldKey}
                        searchKeyword={settings.fieldSearch}
                        onSearchChange={settings.setFieldSearch}
                        onSelect={(fieldKey) => {
                            settings.setRuleModalOpen(false);
                            settings.handleSelectField(fieldKey);
                        }}
                        onCreateField={() => settings.openCreateRule()}
                    />
                    <div className="param-suggest-workspace">
                        {creatingRule ? (
                            <div className="param-suggest-rule-card param-suggest-rule-card-draft is-expanded">
                                <RuleEditor settings={settings} />
                            </div>
                        ) : null}
                        <ActiveRuleWorkspace settings={settings} />
                    </div>
                </div>
            </div>

            <ParamSuggestSqlDrawer
                open={settings.sqlDrawer != null}
                sql={settings.sqlDrawer?.sql ?? ''}
                boundParams={settings.sqlDrawer?.boundParams}
                onClose={() => settings.setSqlDrawer(null)}
            />
            <ImportRulesModal settings={settings} />
        </div>
    );
}
