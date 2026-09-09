import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { DbConnectionConfig, ParamFieldRule } from '../types/paramSuggest';
import { DEFAULT_DB_CONFIG } from '../constants/paramSuggest';
import { ParamSuggestContext } from './ParamSuggestContext';
import { useApiDebugEnv } from './useApiDebugEnv';
import {
    loadParamSuggestRules,
    persistParamSuggestRulesNow,
    reloadMainProcessSuggestConfig,
} from './paramSuggestData';

function isSameRules(a: ParamFieldRule[], b: ParamFieldRule[]): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

export function ParamSuggestProvider({ children }: { children: ReactNode }) {
    const { env: apiEnv, updateEnv } = useApiDebugEnv();
    const activeEnvironment =
        apiEnv.kcxpEnvironments.find((item) => item.id === apiEnv.activeKcxpEnvironmentId) ??
        apiEnv.kcxpEnvironments[0];
    const dbConfig = activeEnvironment?.database ?? DEFAULT_DB_CONFIG;
    const [rules, setRulesState] = useState<ParamFieldRule[]>([]);
    const [loaded, setLoaded] = useState(false);
    const persistedRulesRef = useRef<ParamFieldRule[] | null>(null);

    useEffect(() => {
        void loadParamSuggestRules()
            .then((rulesFile) => {
                persistedRulesRef.current = rulesFile.rules;
                setRulesState(rulesFile.rules);
                setLoaded(true);
                void reloadMainProcessSuggestConfig();
            })
            .catch((error) => {
                console.error('Failed to load param suggest config:', error);
                persistedRulesRef.current = [];
                setLoaded(true);
            });
    }, []);

    useEffect(() => {
        if (!loaded || !persistedRulesRef.current) return;
        if (isSameRules(rules, persistedRulesRef.current)) return;
        persistedRulesRef.current = rules;
        void persistParamSuggestRulesNow(rules);
    }, [rules, loaded]);

    const updateDbConfig = useCallback(
        (config: DbConnectionConfig) => {
            if (!activeEnvironment) return;
            updateEnv(
                'kcxpEnvironments',
                apiEnv.kcxpEnvironments.map((item) =>
                    item.id === activeEnvironment.id ? { ...item, database: config } : item,
                ),
            );
        },
        [activeEnvironment, apiEnv.kcxpEnvironments, updateEnv],
    );

    const setRules = useCallback((nextRules: ParamFieldRule[]) => {
        setRulesState(nextRules);
    }, []);

    const upsertRule = useCallback((rule: ParamFieldRule) => {
        setRulesState((prev) => {
            const index = prev.findIndex((item) => item.id === rule.id);
            if (index < 0) return [...prev, rule];
            const next = [...prev];
            next[index] = rule;
            return next;
        });
    }, []);

    const removeRule = useCallback((ruleId: string) => {
        setRulesState((prev) => prev.filter((item) => item.id !== ruleId));
    }, []);

    const reloadMainConfig = useCallback(async () => {
        await persistParamSuggestRulesNow(rules);
    }, [rules]);

    const syncRulesToMain = useCallback(async (nextRules: ParamFieldRule[]) => {
        persistedRulesRef.current = nextRules;
        setRulesState(nextRules);
        await persistParamSuggestRulesNow(nextRules);
    }, []);

    const value = useMemo(
        () => ({
            dbConfig,
            rules,
            loaded,
            updateDbConfig,
            setRules,
            upsertRule,
            removeRule,
            reloadMainConfig,
            syncRulesToMain,
        }),
        [
            dbConfig,
            rules,
            loaded,
            updateDbConfig,
            setRules,
            upsertRule,
            removeRule,
            reloadMainConfig,
            syncRulesToMain,
        ],
    );

    return <ParamSuggestContext.Provider value={value}>{children}</ParamSuggestContext.Provider>;
}
