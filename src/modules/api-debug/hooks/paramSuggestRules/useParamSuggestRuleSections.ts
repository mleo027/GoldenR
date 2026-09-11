import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormInstance } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import type {
    DbSuggestResponse,
    ParamFieldRule,
    ParamSuggestRulesFile,
} from '../../types/paramSuggest';
import { configRuntime } from '@/runtime/configFacade';
import { PARAM_SUGGEST_RULES_FILE } from '../../constants/paramSuggest';
import { fetchParamSuggestions } from '../../services/paramSuggestService';
import { filterRulesByFieldSearch } from '../../utils/suggest/paramSuggestRuleDisplay';
import {
    EMPTY_RULE_FORM,
    formValuesToRule,
    parseContextParams,
    type RuleFormValues,
} from '../../utils/suggest/paramSuggestRuleForm';
import {
    groupRulesByField,
    normalizeParamFieldRules,
    resolveSuggestRule,
} from '../../utils/suggest/paramSuggestResolve';
import { validateSelectSql } from '../../utils/suggest/paramSuggestSql';

type SyncRules = (rules: ParamFieldRule[]) => Promise<void>;

export function useRuleSelection(rules: ParamFieldRule[]) {
    const [fieldSearch, setFieldSearch] = useState('');
    const [selectedFieldKey, setSelectedFieldKey] = useState<string | null>(null);
    const [testField, setTestField] = useState('');
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
        if (fieldGroups.length === 0) return setSelectedFieldKey(null);
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
            if (group && !group.field.includes(',')) setTestField(group.field);
        },
        [fieldGroups],
    );
    const handleDepFieldClick = useCallback(
        (depName: string) => {
            const target = fieldGroups.find(
                (group) => group.field.toLowerCase() === depName.toLowerCase(),
            );
            if (target) return handleSelectField(target.field.toLowerCase());
            setFieldSearch(depName);
            setTestField(depName);
        },
        [fieldGroups, handleSelectField],
    );

    return {
        fieldSearch,
        setFieldSearch,
        selectedFieldKey,
        testField,
        setTestField,
        fieldGroups,
        activeGroup,
        handleSelectField,
        handleDepFieldClick,
    };
}

export function useRuleEditor(
    rules: ParamFieldRule[],
    sync: SyncRules,
    form: FormInstance<RuleFormValues>,
    message: MessageInstance,
) {
    const [ruleModalOpen, setRuleModalOpen] = useState(false);
    const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
    const [editingRule, setEditingRule] = useState<ParamFieldRule>();
    const [presetField, setPresetField] = useState<string>();
    const [createMode, setCreateMode] = useState<'field' | 'rule'>('field');
    const openCreateRule = useCallback(
        (field?: string) => {
            setEditingRuleId(null);
            setEditingRule(undefined);
            setPresetField(field);
            setCreateMode(field ? 'rule' : 'field');
            form.setFieldsValue({ ...EMPTY_RULE_FORM, field: field ?? '' });
            setRuleModalOpen(true);
        },
        [form],
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
            const next = editingRuleId
                ? rules.map((item) => (item.id === editingRuleId ? rule : item))
                : [...rules, rule];
            try {
                await sync(next);
            } catch (error) {
                message.error(error instanceof Error ? error.message : String(error));
                throw error;
            }
            setRuleModalOpen(false);
            message.success(editingRuleId ? '已更新规则' : '已添加规则');
        },
        [editingRuleId, message, rules, sync],
    );
    const handleToggleEnabled = useCallback(
        (rule: ParamFieldRule, enabled: boolean) =>
            sync(rules.map((item) => (item.id === rule.id ? { ...item, enabled } : item))),
        [rules, sync],
    );
    const handleDeleteRule = useCallback(
        (ruleId: string) => sync(rules.filter((item) => item.id !== ruleId)),
        [rules, sync],
    );
    return {
        ruleModalOpen,
        setRuleModalOpen,
        editingRuleId,
        editingRule,
        presetField,
        createMode,
        openCreateRule,
        openEditRule,
        handleSaveRule,
        handleToggleEnabled,
        handleDeleteRule,
    };
}

function parseImportedRules(text: string): ParamFieldRule[] | null {
    const parsed: unknown = JSON.parse(text);
    const candidates = Array.isArray(parsed)
        ? parsed
        : parsed &&
            typeof parsed === 'object' &&
            Array.isArray((parsed as ParamSuggestRulesFile).rules)
          ? (parsed as ParamSuggestRulesFile).rules
          : null;
    if (!candidates) return null;
    return candidates.filter((item): item is ParamFieldRule =>
        Boolean(
            item &&
            typeof item === 'object' &&
            typeof (item as ParamFieldRule).field === 'string' &&
            (item as ParamFieldRule).type === 'select' &&
            (item as ParamFieldRule).datasource?.sql,
        ),
    );
}

export function useRuleTransfer(
    rules: ParamFieldRule[],
    sync: SyncRules,
    message: MessageInstance,
) {
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [importText, setImportText] = useState('');
    const handleExportRules = useCallback(async () => {
        const payload: ParamSuggestRulesFile = { rules };
        if (configRuntime.isAvailable()) {
            await configRuntime.write(PARAM_SUGGEST_RULES_FILE, payload);
            message.success('已导出到 param-suggest-rules.json');
            return;
        }
        await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
        message.success('规则 JSON 已复制到剪贴板');
    }, [message, rules]);
    const handleImportRules = useCallback(async () => {
        let imported: ParamFieldRule[] | null;
        try {
            imported = parseImportedRules(importText);
        } catch {
            message.error('JSON 格式无效');
            return;
        }
        if (!imported) {
            message.error('需包含 rules 数组或 { "rules": [...] } 格式');
            return;
        }
        if (imported.length === 0) {
            message.error('没有有效的规则');
            return;
        }
        await sync(normalizeParamFieldRules(imported));
        setImportModalOpen(false);
        setImportText('');
        message.success(`已导入 ${imported.length} 条规则`);
    }, [importText, message, sync]);
    return {
        importModalOpen,
        setImportModalOpen,
        importText,
        setImportText,
        handleExportRules,
        handleImportRules,
    };
}

export function useRuleTester(
    rules: ParamFieldRule[],
    testField: string,
    setTestField: (value: string) => void,
    reload: () => Promise<void>,
    message: MessageInstance,
) {
    const [testContext, setTestContext] = useState('');
    const [testKeyword, setTestKeyword] = useState('');
    const [testRunning, setTestRunning] = useState(false);
    const [testResponse, setTestResponse] = useState<DbSuggestResponse | null>(null);
    const [sqlDrawer, setSqlDrawer] = useState<{
        sql: string;
        boundParams?: Record<string, string | number>;
    } | null>(null);
    const testResolvedRule = useMemo(
        () =>
            testField.trim()
                ? resolveSuggestRule(rules, {
                      field: testField.trim(),
                      contextParams: parseContextParams(testContext),
                  })
                : undefined,
        [rules, testContext, testField],
    );
    const handleRunTest = useCallback(async () => {
        if (!testField.trim()) {
            message.warning('请先填写测试字段');
            return;
        }
        setTestRunning(true);
        setTestResponse(null);
        try {
            await reload();
            setTestResponse(
                await fetchParamSuggestions({
                    field: testField.trim(),
                    contextParams: parseContextParams(testContext),
                    keyword: testKeyword.trim() || undefined,
                }),
            );
        } catch (error) {
            setTestResponse({
                options: [],
                error: error instanceof Error ? error.message : String(error),
            });
        } finally {
            setTestRunning(false);
        }
    }, [message, reload, testContext, testField, testKeyword]);
    return {
        testField,
        setTestField,
        testContext,
        setTestContext,
        testKeyword,
        setTestKeyword,
        testRunning,
        testResponse,
        sqlDrawer,
        setSqlDrawer,
        testResolvedRule,
        handleRunTest,
    };
}
