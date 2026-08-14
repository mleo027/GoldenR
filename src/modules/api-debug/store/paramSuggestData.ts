import type {
    DbConnectionConfig,
    ParamFieldRule,
    ParamSuggestRulesFile,
} from '../types/paramSuggest';
import {
    DB_CONFIG_FILE,
    DEFAULT_DB_CONFIG,
    DEFAULT_PARAM_SUGGEST_RULES,
    PARAM_SUGGEST_RULES_FILE,
} from '../constants/paramSuggest';
import { normalizeParamFieldRules } from '../utils/suggest/paramSuggestResolve';
import { UI_DEBOUNCE_MS } from '../../../constants/ui';

const SAVE_DEBOUNCE_MS = UI_DEBOUNCE_MS.save;

let dbSaveTimer: ReturnType<typeof setTimeout> | null = null;
let rulesSaveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingDbConfig: DbConnectionConfig | null = null;
let pendingRules: ParamSuggestRulesFile | null = null;

function isDbConnectionConfig(value: unknown): value is DbConnectionConfig {
    if (!value || typeof value !== 'object') return false;
    const config = value as Partial<DbConnectionConfig>;
    return (
        typeof config.server === 'string' &&
        typeof config.database === 'string' &&
        typeof config.user === 'string' &&
        typeof config.password === 'string'
    );
}

function isParamSuggestRulesFile(value: unknown): value is ParamSuggestRulesFile {
    if (!value || typeof value !== 'object') return false;
    const file = value as Partial<ParamSuggestRulesFile>;
    return Array.isArray(file.rules);
}

async function readJson(fileName: string): Promise<unknown> {
    if (!window.electronAPI) return null;
    try {
        return await window.electronAPI.readJsonFile(fileName, false);
    } catch {
        return null;
    }
}

export function mergeDbConfig(partial?: Partial<DbConnectionConfig>): DbConnectionConfig {
    return {
        ...DEFAULT_DB_CONFIG,
        ...partial,
        options: {
            ...DEFAULT_DB_CONFIG.options,
            ...partial?.options,
        },
    };
}

export async function loadDbConfig(): Promise<DbConnectionConfig> {
    const cached = await readJson(DB_CONFIG_FILE);
    if (isDbConnectionConfig(cached)) {
        return mergeDbConfig(cached);
    }
    return { ...DEFAULT_DB_CONFIG };
}

export async function loadParamSuggestRules(): Promise<ParamSuggestRulesFile> {
    const cached = await readJson(PARAM_SUGGEST_RULES_FILE);
    if (isParamSuggestRulesFile(cached)) {
        return { rules: normalizeParamFieldRules([...cached.rules]) };
    }
    return { ...DEFAULT_PARAM_SUGGEST_RULES, rules: [] };
}

function scheduleDbConfigSave(config: DbConnectionConfig): void {
    pendingDbConfig = config;
    if (dbSaveTimer) clearTimeout(dbSaveTimer);
    dbSaveTimer = setTimeout(() => {
        if (pendingDbConfig && window.electronAPI) {
            window.electronAPI.writeJsonFile(DB_CONFIG_FILE, pendingDbConfig).catch(console.error);
        }
        pendingDbConfig = null;
        dbSaveTimer = null;
    }, SAVE_DEBOUNCE_MS);
}

function scheduleRulesSave(rulesFile: ParamSuggestRulesFile): void {
    pendingRules = rulesFile;
    if (rulesSaveTimer) clearTimeout(rulesSaveTimer);
    rulesSaveTimer = setTimeout(() => {
        if (pendingRules && window.electronAPI) {
            window.electronAPI
                .writeJsonFile(PARAM_SUGGEST_RULES_FILE, pendingRules)
                .catch(console.error);
        }
        pendingRules = null;
        rulesSaveTimer = null;
    }, SAVE_DEBOUNCE_MS);
}

export function saveDbConfig(config: DbConnectionConfig): void {
    scheduleDbConfigSave(config);
}

export function saveParamSuggestRules(rules: ParamFieldRule[]): void {
    scheduleRulesSave({ rules });
}

export async function persistParamSuggestRulesNow(rules: ParamFieldRule[]): Promise<void> {
    if (rulesSaveTimer) {
        clearTimeout(rulesSaveTimer);
        rulesSaveTimer = null;
    }
    pendingRules = null;

    if (window.electronAPI) {
        await window.electronAPI.writeJsonFile(PARAM_SUGGEST_RULES_FILE, { rules });
        await reloadMainProcessSuggestConfig();
    }
}

export async function persistDbConfigNow(config: DbConnectionConfig): Promise<void> {
    if (dbSaveTimer) {
        clearTimeout(dbSaveTimer);
        dbSaveTimer = null;
    }
    pendingDbConfig = null;

    if (window.electronAPI) {
        await window.electronAPI.writeJsonFile(DB_CONFIG_FILE, config);
        await reloadMainProcessSuggestConfig();
    }
}

export function flushPendingParamSuggestSave(): void {
    if (dbSaveTimer) {
        clearTimeout(dbSaveTimer);
        dbSaveTimer = null;
    }
    if (rulesSaveTimer) {
        clearTimeout(rulesSaveTimer);
        rulesSaveTimer = null;
    }

    if (window.electronAPI) {
        if (pendingDbConfig) {
            void window.electronAPI.writeJsonFile(DB_CONFIG_FILE, pendingDbConfig);
            pendingDbConfig = null;
        }
        if (pendingRules) {
            void window.electronAPI.writeJsonFile(PARAM_SUGGEST_RULES_FILE, pendingRules);
            pendingRules = null;
        }
    }
}

export async function flushPendingParamSuggestSaveAsync(): Promise<void> {
    if (dbSaveTimer) {
        clearTimeout(dbSaveTimer);
        dbSaveTimer = null;
    }
    if (rulesSaveTimer) {
        clearTimeout(rulesSaveTimer);
        rulesSaveTimer = null;
    }

    if (window.electronAPI) {
        if (pendingDbConfig) {
            await window.electronAPI.writeJsonFile(DB_CONFIG_FILE, pendingDbConfig);
            pendingDbConfig = null;
        }
        if (pendingRules) {
            await window.electronAPI.writeJsonFile(PARAM_SUGGEST_RULES_FILE, pendingRules);
            pendingRules = null;
        }
    }
}

export async function reloadMainProcessSuggestConfig(): Promise<void> {
    if (window.electronAPI?.reloadSuggestConfig) {
        await window.electronAPI.reloadSuggestConfig();
    }
}
