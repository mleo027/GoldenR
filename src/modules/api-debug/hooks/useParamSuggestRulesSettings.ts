import { useCallback, useEffect, useMemo, useState } from 'react';
import { App, Form } from 'antd';
import type {
    DbSuggestResponse,
    ParamFieldRule,
    ParamSuggestRulesFile,
} from '../types/paramSuggest';
import { getElectronAPI } from '@/lib/electron';
import {
    groupRulesByField,
    normalizeParamFieldRules,
    resolveSuggestRule,
} from '../utils/suggest/paramSuggestResolve';
import { validateSelectSql } from '../utils/suggest/paramSuggestSql';
import {
    EMPTY_RULE_FORM,
    formValuesToRule,
    parseContextParams,
    type RuleFormValues,
} from '../utils/suggest/paramSuggestRuleForm';
import { fetchParamSuggestions } from '../services/paramSuggestService';
import { useParamSuggest } from '../store/useParamSuggest';
import { PARAM_SUGGEST_RULES_FILE } from '../constants/paramSuggest';
import { filterRulesByFieldSearch } from '../utils/suggest/paramSuggestRuleDisplay';

function isParamSuggestRulesFile(value: unknown): value is ParamSuggestRulesFile {
    return Boolean(
        value && typeof value === 'object' && Array.isArray((value as ParamSuggestRulesFile).rules),
    );
}

export function useParamSuggestRulesSettings() {
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
        const api = getElectronAPI();
        if (api) {
            await api.config.write(PARAM_SUGGEST_RULES_FILE, payload);
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

    return {
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
    };
}
