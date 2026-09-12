import { create } from 'zustand';
import type { DbConnectionConfig, ParamFieldRule } from '../types/paramSuggest';
import { DEFAULT_DB_CONFIG } from '../constants/paramSuggest';
import { useApiDebugEnvStore } from './apiDebugEnvStore';
import {
    loadParamSuggestRules,
    persistParamSuggestRulesNow,
    reloadMainProcessSuggestConfig,
} from './paramSuggestData';

interface ParamSuggestStore {
    rules: ParamFieldRule[];
    loaded: boolean;
    load: () => Promise<void>;
    dbConfig: DbConnectionConfig;
    updateDbConfig: (config: DbConnectionConfig) => void;
    setRules: (rules: ParamFieldRule[]) => void;
    upsertRule: (rule: ParamFieldRule) => void;
    removeRule: (ruleId: string) => void;
    reloadMainConfig: () => Promise<void>;
    syncRulesToMain: (rules: ParamFieldRule[]) => Promise<void>;
}

let loadPromise: Promise<void> | null = null;

function getDbConfig(): DbConnectionConfig {
    const { env } = useApiDebugEnvStore.getState();
    const active =
        env.kcxpEnvironments.find((item) => item.id === env.activeKcxpEnvironmentId) ??
        env.kcxpEnvironments[0];
    return active?.database ?? DEFAULT_DB_CONFIG;
}

export const useParamSuggestStore = create<ParamSuggestStore>((set, get) => ({
    rules: [],
    loaded: false,
    dbConfig: getDbConfig(),
    load: () => {
        if (get().loaded) return Promise.resolve();
        if (!loadPromise) {
            loadPromise = loadParamSuggestRules()
                .then((file) => {
                    set({ rules: file.rules, loaded: true, dbConfig: getDbConfig() });
                    void reloadMainProcessSuggestConfig();
                })
                .catch((error) => {
                    console.error('Failed to load param suggest config:', error);
                    set({ loaded: true, dbConfig: getDbConfig() });
                })
                .finally(() => {
                    loadPromise = null;
                });
        }
        return loadPromise;
    },
    updateDbConfig: (config) => {
        const { env, updateEnv } = useApiDebugEnvStore.getState();
        const activeId = env.activeKcxpEnvironmentId;
        if (!activeId) return;
        updateEnv(
            'kcxpEnvironments',
            env.kcxpEnvironments.map((item) =>
                item.id === activeId ? { ...item, database: config } : item,
            ),
        );
        set({ dbConfig: config });
    },
    setRules: (rules) => {
        set({ rules });
        if (get().loaded) void persistParamSuggestRulesNow(rules);
    },
    upsertRule: (rule) => {
        const rules = [...get().rules];
        const index = rules.findIndex((item) => item.id === rule.id);
        if (index < 0) rules.push(rule);
        else rules[index] = rule;
        get().setRules(rules);
    },
    removeRule: (ruleId) => get().setRules(get().rules.filter((item) => item.id !== ruleId)),
    reloadMainConfig: () => persistParamSuggestRulesNow(get().rules),
    syncRulesToMain: async (rules) => {
        set({ rules });
        await persistParamSuggestRulesNow(rules);
    },
}));

useApiDebugEnvStore.subscribe(() => {
    useParamSuggestStore.setState({ dbConfig: getDbConfig() });
});
