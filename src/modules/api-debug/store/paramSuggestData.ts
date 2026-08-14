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
import type { ConfigStorageFileName } from '@/shared/config/files';
import { UI_DEBOUNCE_MS } from '../../../constants/ui';
import { getElectronAPI } from '../../../lib/electron';
import { configStorage } from '../../../services/persistence/configStorage';
import { DebounceWriter } from '../../../services/persistence/debounceWriter';

const SAVE_DEBOUNCE_MS = UI_DEBOUNCE_MS.save;

const dbConfigWriter = new DebounceWriter<DbConnectionConfig>({
    write: (config) => configStorage.write(DB_CONFIG_FILE, config),
    delayMs: SAVE_DEBOUNCE_MS,
    onError: console.error,
});

const rulesWriter = new DebounceWriter<ParamSuggestRulesFile>({
    write: (rules) => configStorage.write(PARAM_SUGGEST_RULES_FILE, rules),
    delayMs: SAVE_DEBOUNCE_MS,
    onError: console.error,
});

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

async function readJson(fileName: ConfigStorageFileName): Promise<unknown> {
    return configStorage.read(fileName, false);
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
    dbConfigWriter.schedule(config);
}

function scheduleRulesSave(rulesFile: ParamSuggestRulesFile): void {
    rulesWriter.schedule(rulesFile);
}

export function saveDbConfig(config: DbConnectionConfig): void {
    scheduleDbConfigSave(config);
}

export function saveParamSuggestRules(rules: ParamFieldRule[]): void {
    scheduleRulesSave({ rules });
}

export async function persistParamSuggestRulesNow(rules: ParamFieldRule[]): Promise<void> {
    await rulesWriter.flush();
    await configStorage.write(PARAM_SUGGEST_RULES_FILE, { rules });
    await reloadMainProcessSuggestConfig();
}

export async function persistDbConfigNow(config: DbConnectionConfig): Promise<void> {
    await dbConfigWriter.flush();
    await configStorage.write(DB_CONFIG_FILE, config);
    await reloadMainProcessSuggestConfig();
}

export function flushPendingParamSuggestSave(): void {
    void dbConfigWriter.flush();
    void rulesWriter.flush();
}

export async function flushPendingParamSuggestSaveAsync(): Promise<void> {
    await Promise.all([dbConfigWriter.flush(), rulesWriter.flush()]);
}

export async function reloadMainProcessSuggestConfig(): Promise<void> {
    const api = getElectronAPI();
    if (api?.database.reloadSuggestConfig) {
        await api.database.reloadSuggestConfig();
    }
}
