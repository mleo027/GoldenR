import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DbSuggestOption } from '../types/paramSuggest';
import type { ParamItem } from '../types/workspace';
import { fetchParamSuggestions } from '../services/paramSuggestService';
import { useParamSuggest } from '../store/useParamSuggest';
import { hasSuggestRule, fieldHasSuggestRules } from '../utils/suggest/paramSuggestResolve';
import { useApiDebugEnv } from '../store/useApiDebugEnv';
import { getActiveKcxpEnvironment } from '../utils/workspace/kcxpEnvironment';
import { DEFAULT_DB_CONFIG } from '../constants/paramSuggest';

function buildContextParams(params: ParamItem[]): Record<string, string> {
    const context: Record<string, string> = {};
    for (const param of params) {
        if (param.type === 'disabled' || !param.name.trim()) continue;
        context[param.name] = param.value;
    }
    return context;
}

interface UseParamSuggestionsOptions {
    fieldName: string;
    params: ParamItem[];
    keyword?: string;
    enabled?: boolean;
}

interface UseParamSuggestionsResult {
    options: DbSuggestOption[];
    loading: boolean;
    pendingDeps: string[];
    error?: string;
    hasRule: boolean;
    hasFieldRule: boolean;
    refresh: () => void;
}

export function useParamSuggestions({
    fieldName,
    params,
    keyword,
    enabled = true,
}: UseParamSuggestionsOptions): UseParamSuggestionsResult {
    const { rules, loaded } = useParamSuggest();
    const { env } = useApiDebugEnv();
    const [options, setOptions] = useState<DbSuggestOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [pendingDeps, setPendingDeps] = useState<string[]>([]);
    const [error, setError] = useState<string | undefined>();
    const requestIdRef = useRef(0);

    const [debouncedKeyword, setDebouncedKeyword] = useState(keyword ?? '');

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedKeyword(keyword ?? ''), 200);
        return () => clearTimeout(timer);
    }, [keyword]);

    const hasFieldRule = useMemo(() => fieldHasSuggestRules(rules, fieldName), [rules, fieldName]);

    const hasRule = useMemo(
        () =>
            hasSuggestRule(rules, {
                field: fieldName,
                contextParams: buildContextParams(params),
            }),
        [rules, fieldName, params],
    );

    const contextParams = useMemo(() => buildContextParams(params), [params]);

    const contextKey = useMemo(() => JSON.stringify(contextParams), [contextParams]);

    const loadSuggestions = useCallback(async () => {
        if (!enabled || !loaded || !hasRule || !fieldName.trim()) {
            setOptions([]);
            setPendingDeps([]);
            setError(undefined);
            return;
        }

        const requestId = ++requestIdRef.current;
        setLoading(true);
        setError(undefined);

        try {
            const environment = getActiveKcxpEnvironment(
                env.kcxpEnvironments,
                env.activeKcxpEnvironmentId,
            );
            const response = await fetchParamSuggestions({
                field: fieldName,
                contextParams,
                keyword: debouncedKeyword,
                // 环境缺少 database 时回落默认配置，与 paramSuggestStore/RequestSettings 保持一致
                databaseConfig: environment.database ?? DEFAULT_DB_CONFIG,
            });

            if (requestId !== requestIdRef.current) return;

            setOptions(response.options);
            setPendingDeps(response.pendingDeps ?? []);
            setError(response.error);
        } catch (err) {
            if (requestId !== requestIdRef.current) return;
            setOptions([]);
            setPendingDeps([]);
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            if (requestId === requestIdRef.current) {
                setLoading(false);
            }
        }
    }, [enabled, loaded, hasRule, fieldName, contextParams, debouncedKeyword, env]);

    useEffect(() => {
        void loadSuggestions();
    }, [loadSuggestions, contextKey]);

    return {
        options,
        loading,
        pendingDeps,
        error,
        hasRule,
        hasFieldRule,
        refresh: loadSuggestions,
    };
}
