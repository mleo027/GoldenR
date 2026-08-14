import { createContext } from 'react';
import type { DbConnectionConfig, ParamFieldRule } from '../types/paramSuggest';

export interface ParamSuggestContextValue {
    dbConfig: DbConnectionConfig;
    rules: ParamFieldRule[];
    loaded: boolean;
    updateDbConfig: (config: DbConnectionConfig) => void;
    setRules: (rules: ParamFieldRule[]) => void;
    upsertRule: (rule: ParamFieldRule) => void;
    removeRule: (ruleId: string) => void;
    reloadMainConfig: () => Promise<void>;
    syncRulesToMain: (rules: ParamFieldRule[]) => Promise<void>;
}

export const ParamSuggestContext = createContext<ParamSuggestContextValue | null>(null);
