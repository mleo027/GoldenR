export const APP_ENV_FILE = 'app.json';
export const SETTINGS_FILE = 'settings.json';
export const PROJECT_FILE = 'project.json';
export const API_DEBUG_ENV_FILE = 'api-debug.env.json';

export const DB_CONFIG_FILE = 'db.json';
export const PARAM_SUGGEST_RULES_FILE = 'param-suggest-rules.json';
export const COMMON_PARAMS_FILE = 'common-params.json';

export const KCBP_ENV_FILE = 'kcbp.env.json';
export const KUAB_PROFILES_FILE = 'kuab.profiles.json';
export const REQUEST_HISTORY_FILE = 'request-history.json';
/** 仅用于从旧 GoldenAPI 的 tracecode.env.json 迁移历史 KCBP 配置。 */
export const TRACECODE_ENV_FILE = 'tracecode.env.json';

/** 所有需要应用配置中心统一管理的持久化配置文件名。 */
export const PERSISTED_CONFIG_FILES = [
    'app.json',
    'api-debug.env.json',
    'project.json',
    'settings.json',
    'db.json',
    'param-suggest-rules.json',
    'common-params.json',
    'kcbp.env.json',
    'kuab.profiles.json',
] as const;

/** 旧版本迁移时备份的配置文件名，允许 Renderer 通过配置 IPC 写入。 */
export const LEGACY_CONFIG_BACKUP_FILES = [
    'app.api-debug.legacy-migrated.json',
    'settings.preferences.legacy-migrated.json',
] as const;

export const CONFIG_STORAGE_FILES = [
    ...PERSISTED_CONFIG_FILES,
    ...LEGACY_CONFIG_BACKUP_FILES,
    REQUEST_HISTORY_FILE,
] as const;

export type PersistedConfigFileName = (typeof PERSISTED_CONFIG_FILES)[number];
export type ConfigStorageFileName = (typeof CONFIG_STORAGE_FILES)[number];

export function isPersistedConfigFileName(fileName: string): fileName is PersistedConfigFileName {
    return (PERSISTED_CONFIG_FILES as readonly string[]).includes(fileName);
}

export function isConfigStorageFileName(fileName: string): fileName is ConfigStorageFileName {
    return (CONFIG_STORAGE_FILES as readonly string[]).includes(fileName);
}

export function assertPersistedConfigFileName(fileName: string): PersistedConfigFileName {
    if (!isPersistedConfigFileName(fileName)) {
        throw new Error(`Unknown persisted config file: ${fileName}`);
    }
    return fileName;
}

export function assertConfigStorageFileName(fileName: string): ConfigStorageFileName {
    if (!isConfigStorageFileName(fileName)) {
        throw new Error(`Unknown config storage file: ${fileName}`);
    }
    return fileName;
}
