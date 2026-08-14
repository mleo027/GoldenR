import { useEffect, useMemo, useState } from 'react';
import {
    App,
    Collapse,
    Form,
    Input,
    InputNumber,
    Modal,
    Select,
    Switch,
    Tag,
    Typography,
} from 'antd';
import type { FormInstance } from 'antd';
import type { ParamFieldRule, ParamSuggestBinding } from '../../types/paramSuggest';
import {
    SUGGEST_SQL_COLUMN_HINT,
    SUGGEST_SQL_OPTIONAL_PLACEHOLDER_HINT,
} from '../../constants/paramSuggest';
import { formatSqlPlaceholderToken, validateSelectSql } from '../../utils/suggest/paramSuggestSql';
import {
    buildBindingRows,
    EMPTY_RULE_FORM,
    hasNonDefaultBindings,
    normalizeBindingRows,
    resolveRuleFormValues,
    ruleToFormValues,
    type BindingMode,
    type RuleFormValues,
} from '../../utils/suggest/paramSuggestRuleForm';
import { createRuleId, parseRuleFields } from '../../utils/suggest/paramSuggestResolve';
import ParamSuggestFieldTags from './ParamSuggestFieldTags';
import ParamSuggestSqlAnalysis from './ParamSuggestSqlAnalysis';
import ParamSuggestSqlEditor from './ParamSuggestSqlEditor';
import ParamSuggestRuleFormTest from './ParamSuggestRuleFormTest';

interface ParamSuggestRuleFormModalProps {
    open: boolean;
    editingRuleId: string | null;
    createMode: 'field' | 'rule';
    initialRule?: ParamFieldRule;
    presetField?: string;
    form: FormInstance<RuleFormValues>;
    onCancel: () => void;
    onSave: (values: RuleFormValues, ruleId: string) => Promise<void>;
    onViewSql?: (sql: string, boundParams?: Record<string, string | number>) => void;
}

export default function ParamSuggestRuleFormModal({
    open,
    editingRuleId,
    createMode,
    initialRule,
    presetField,
    form,
    onCancel,
    onSave,
    onViewSql,
}: ParamSuggestRuleFormModalProps) {
    const { message } = App.useApp();
    const fieldEditable = createMode === 'field' && !editingRuleId;
    const watchedSql = Form.useWatch('sql', form) ?? '';
    const watchedBindingsRaw = Form.useWatch('bindings', form);
    const watchedBindings = useMemo(
        () => normalizeBindingRows(watchedBindingsRaw),
        [watchedBindingsRaw],
    );
    const [bindingsExpanded, setBindingsExpanded] = useState(false);

    const formSnapshot = Form.useWatch([], form);
    const currentFormValues = useMemo(
        () => ({ ...EMPTY_RULE_FORM, ...formSnapshot }) as RuleFormValues,
        [formSnapshot],
    );

    useEffect(() => {
        if (!open) return;
        if (initialRule) {
            form.setFieldsValue(ruleToFormValues(initialRule));
            return;
        }
        form.setFieldsValue({
            ...EMPTY_RULE_FORM,
            field: presetField ?? '',
        });
    }, [open, initialRule, presetField, form]);

    useEffect(() => {
        if (!open) return;
        const currentBindings = normalizeBindingRows(form.getFieldValue('bindings'));
        const nextBindings = buildBindingRows(
            watchedSql,
            Object.fromEntries(
                currentBindings.map((row) => {
                    if (row.mode === 'literal') {
                        return [
                            row.placeholder,
                            { type: 'literal' as const, value: row.literalValue ?? '' },
                        ];
                    }
                    if (row.mode === 'param' && row.paramName) {
                        return [row.placeholder, { type: 'param' as const, name: row.paramName }];
                    }
                    return [row.placeholder, { type: 'param' as const, name: row.placeholder }];
                }),
            ) as Record<string, ParamSuggestBinding>,
        );
        if (JSON.stringify(currentBindings) !== JSON.stringify(nextBindings)) {
            form.setFieldValue('bindings', nextBindings);
        }
    }, [watchedSql, open, form]);

    useEffect(() => {
        if (!open) return;
        if (hasNonDefaultBindings(watchedBindings)) {
            setBindingsExpanded(true);
        }
    }, [open, watchedBindings]);

    const bindingCount = watchedBindings.length;
    const title = editingRuleId ? '编辑规则' : createMode === 'field' ? '新建字段' : '添加规则';

    const handleOk = async () => {
        try {
            const values = resolveRuleFormValues(
                await form.validateFields(),
                form.getFieldValue('bindings'),
            );
            const sqlCheck = validateSelectSql(values.sql);
            if (!sqlCheck.ok) {
                message.error(sqlCheck.reason);
                return Promise.reject(new Error(sqlCheck.reason));
            }
            if (parseRuleFields(values.field).length === 0) {
                message.error('请至少填写一个字段名');
                return Promise.reject(new Error('请至少填写一个字段名'));
            }
            const ruleId = editingRuleId ?? createRuleId();
            await onSave(values, ruleId);
        } catch (error) {
            if (error && typeof error === 'object' && 'errorFields' in error) {
                const validationError = error as {
                    errorFields?: Array<{ name: Array<string | number> }>;
                };
                const firstError = validationError.errorFields?.[0];
                if (firstError?.name?.[0] === 'bindings') {
                    setBindingsExpanded(true);
                }
                message.error('请检查表单中标红的必填项');
                if (firstError?.name) {
                    form.scrollToField(firstError.name, { behavior: 'smooth', block: 'center' });
                }
            } else if (error instanceof Error && error.message) {
                message.error(error.message);
            }
            throw error;
        }
    };

    return (
        <Modal
            open={open}
            title={title}
            centered
            destroyOnHidden
            width={840}
            className="app-modal param-suggest-rule-form-modal"
            onCancel={onCancel}
            onOk={handleOk}
            okText="保存"
        >
            <Form form={form} layout="vertical" initialValues={EMPTY_RULE_FORM}>
                <Typography.Text strong className="param-suggest-form-section">
                    规则定义
                </Typography.Text>
                <Form.Item
                    label="适用字段"
                    name="field"
                    rules={[{ required: true, message: '请输入字段名' }]}
                    extra={
                        fieldEditable
                            ? '多个字段共用同一规则时用逗号分隔，如 operid, auditoperid'
                            : '编辑规则时不可修改适用字段'
                    }
                >
                    <ParamSuggestFieldTags editable={fieldEditable} />
                </Form.Item>
                <div className="grid grid-cols-2 gap-x-4">
                    <Form.Item label="触发方式" name="trigger">
                        <Select
                            options={[
                                { value: 'focus', label: '聚焦时查询' },
                                { value: 'typing', label: '输入时过滤' },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item label="优先级" name="priority" extra="同场景下越大越优先">
                        <InputNumber className="w-full" min={0} max={999} />
                    </Form.Item>
                </div>

                <Typography.Text strong className="param-suggest-form-section">
                    SQL 编辑器
                </Typography.Text>
                <Typography.Paragraph type="secondary" className="text-xs mt-0 mb-2">
                    {SUGGEST_SQL_COLUMN_HINT}。{SUGGEST_SQL_OPTIONAL_PLACEHOLDER_HINT}
                </Typography.Paragraph>
                <Form.Item
                    name="sql"
                    rules={[{ required: true, message: '请输入 SQL' }]}
                    className="param-suggest-sql-form-item"
                >
                    <ParamSuggestSqlEditor />
                </Form.Item>
                <ParamSuggestSqlAnalysis sql={watchedSql} />

                {bindingCount > 0 ? (
                    <Collapse
                        ghost
                        className="param-suggest-bindings-collapse mt-3"
                        activeKey={bindingsExpanded ? ['bindings'] : []}
                        onChange={(keys) => setBindingsExpanded(keys.includes('bindings'))}
                        items={[
                            {
                                key: 'bindings',
                                forceRender: true,
                                label: (
                                    <Typography.Text strong className="text-sm">
                                        占位符绑定（{bindingCount}）
                                    </Typography.Text>
                                ),
                                children: (
                                    <Form.List name="bindings">
                                        {(fields) => (
                                            <div className="flex flex-col gap-2">
                                                {hasNonDefaultBindings(watchedBindings) ? (
                                                    <Typography.Text
                                                        type="secondary"
                                                        className="text-xs"
                                                    >
                                                        存在非默认同名绑定，请确认配置是否正确
                                                    </Typography.Text>
                                                ) : null}
                                                {fields.map((field) => {
                                                    const placeholder = form.getFieldValue([
                                                        'bindings',
                                                        field.name,
                                                        'placeholder',
                                                    ]) as string;
                                                    const optional = form.getFieldValue([
                                                        'bindings',
                                                        field.name,
                                                        'optional',
                                                    ]) as boolean;
                                                    return (
                                                        <div
                                                            key={field.key}
                                                            className={`param-suggest-binding-row${optional ? ' param-suggest-binding-row-optional' : ' param-suggest-binding-row-required'}`}
                                                        >
                                                            <div className="param-suggest-binding-token">
                                                                <Typography.Text className="font-mono text-xs">
                                                                    {formatSqlPlaceholderToken({
                                                                        name: placeholder,
                                                                        optional: Boolean(optional),
                                                                    })}
                                                                </Typography.Text>
                                                                <Tag
                                                                    color={
                                                                        optional
                                                                            ? 'default'
                                                                            : 'cyan'
                                                                    }
                                                                    className="param-suggest-placeholder-tag"
                                                                >
                                                                    {optional ? '可选' : '必填'}
                                                                </Tag>
                                                            </div>
                                                            <Form.Item
                                                                name={[field.name, 'placeholder']}
                                                                hidden
                                                            >
                                                                <Input />
                                                            </Form.Item>
                                                            <Form.Item
                                                                name={[field.name, 'optional']}
                                                                hidden
                                                            >
                                                                <Input />
                                                            </Form.Item>
                                                            <Form.Item
                                                                name={[field.name, 'mode']}
                                                                className="mb-0"
                                                            >
                                                                <Select
                                                                    options={[
                                                                        {
                                                                            value: 'auto',
                                                                            label: '同名入参',
                                                                        },
                                                                        {
                                                                            value: 'param',
                                                                            label: '其他入参',
                                                                        },
                                                                        {
                                                                            value: 'literal',
                                                                            label: '固定值',
                                                                        },
                                                                    ]}
                                                                />
                                                            </Form.Item>
                                                            <Form.Item noStyle shouldUpdate>
                                                                {() => {
                                                                    const mode = form.getFieldValue(
                                                                        [
                                                                            'bindings',
                                                                            field.name,
                                                                            'mode',
                                                                        ],
                                                                    ) as BindingMode;
                                                                    if (mode === 'param') {
                                                                        return (
                                                                            <Form.Item
                                                                                name={[
                                                                                    field.name,
                                                                                    'paramName',
                                                                                ]}
                                                                                className="mb-0"
                                                                                rules={[
                                                                                    {
                                                                                        required: true,
                                                                                        message:
                                                                                            '请输入入参名',
                                                                                    },
                                                                                ]}
                                                                            >
                                                                                <Input placeholder="引用的入参名" />
                                                                            </Form.Item>
                                                                        );
                                                                    }
                                                                    if (mode === 'literal') {
                                                                        return (
                                                                            <Form.Item
                                                                                name={[
                                                                                    field.name,
                                                                                    'literalValue',
                                                                                ]}
                                                                                className="mb-0"
                                                                                rules={[
                                                                                    {
                                                                                        required: true,
                                                                                        message:
                                                                                            '请输入固定值',
                                                                                    },
                                                                                ]}
                                                                            >
                                                                                <Input placeholder="如 1" />
                                                                            </Form.Item>
                                                                        );
                                                                    }
                                                                    return (
                                                                        <Typography.Text
                                                                            type="secondary"
                                                                            className="text-xs leading-8"
                                                                        >
                                                                            {optional
                                                                                ? '未填写时去掉对应 SQL 条件，规则仍可命中'
                                                                                : '未填写时跳过本规则'}
                                                                        </Typography.Text>
                                                                    );
                                                                }}
                                                            </Form.Item>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </Form.List>
                                ),
                            },
                        ]}
                    />
                ) : null}

                <Typography.Text strong className="param-suggest-form-section">
                    缓存配置
                </Typography.Text>
                <div className="grid grid-cols-3 gap-x-4">
                    <Form.Item label="启用规则" name="enabled" valuePropName="checked">
                        <Switch size="small" />
                    </Form.Item>
                    <Form.Item label="启用缓存" name="cacheEnabled" valuePropName="checked">
                        <Switch size="small" />
                    </Form.Item>
                    <Form.Item
                        label="缓存 TTL（秒）"
                        name="cacheTtlSeconds"
                        rules={[
                            { required: true, message: '请输入缓存 TTL' },
                            {
                                type: 'number',
                                min: 10,
                                max: 86400,
                                message: 'TTL 需在 10–86400 秒之间',
                            },
                        ]}
                    >
                        <InputNumber className="w-full" min={10} max={86400} />
                    </Form.Item>
                </div>

                <ParamSuggestRuleFormTest
                    formValues={currentFormValues}
                    editingRuleId={editingRuleId}
                    onViewSql={onViewSql}
                />
            </Form>
        </Modal>
    );
}

export type { RuleFormValues };
