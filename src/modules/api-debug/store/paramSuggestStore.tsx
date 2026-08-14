import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { DbConnectionConfig, ParamFieldRule } from '../types/paramSuggest';
import { DEFAULT_DB_CONFIG } from '../constants/paramSuggest';
import { ParamSuggestContext } from './ParamSuggestContext';
import {
    loadDbConfig,
    loadParamSuggestRules,
    persistDbConfigNow,
    persistParamSuggestRulesNow,
    reloadMainProcessSuggestConfig,
} from './paramSuggestData';

function isSameDbConfig(a: DbConnectionConfig, b: DbConnectionConfig): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

function isSameRules(a: ParamFieldRule[], b: ParamFieldRule[]): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

export function ParamSuggestProvider({ children }: { children: ReactNode }) {
    const [dbConfig, setDbConfig] = useState<DbConnectionConfig>({ ...DEFAULT_DB_CONFIG });
    const [rules, setRulesState] = useState<ParamFieldRule[]>([]);
    const [loaded, setLoaded] = useState(false);
    const persistedDbRef = useRef<DbConnectionConfig | null>(null);
    const persistedRulesRef = useRef<ParamFieldRule[] | null>(null);

    useEffect(() => {
        Promise.all([loadDbConfig(), loadParamSuggestRules()]).then(([db, rulesFile]) => {
            persistedDbRef.current = db;
            persistedRulesRef.current = rulesFile.rules;
            setDbConfig(db);
            setRulesState(rulesFile.rules);
            setLoaded(true);
            void reloadMainProcessSuggestConfig();
        });
    }, []);

    useEffect(() => {
        if (!loaded || !persistedDbRef.current) return;
        if (isSameDbConfig(dbConfig, persistedDbRef.current)) return;
        persistedDbRef.current = dbConfig;
        void persistDbConfigNow(dbConfig);
    }, [dbConfig, loaded]);

    useEffect(() => {
        if (!loaded || !persistedRulesRef.current) return;
        if (isSameRules(rules, persistedRulesRef.current)) return;
        persistedRulesRef.current = rules;
        void persistParamSuggestRulesNow(rules);
    }, [rules, loaded]);

    const updateDbConfig = useCallback((config: DbConnectionConfig) => {
        setDbConfig(config);
    }, []);

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
