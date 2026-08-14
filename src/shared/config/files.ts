export const APP_ENV_FILE = 'app.json';
export const SETTINGS_FILE = 'settings.json';
export const PROJECT_FILE = 'project.json';
export const API_DEBUG_ENV_FILE = 'api-debug.env.json';

export const DB_CONFIG_FILE = 'db.json';
export const PARAM_SUGGEST_RULES_FILE = 'param-suggest-rules.json';

export const KCBP_ENV_FILE = 'kcbp.env.json';
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
    'kcbp.env.json',
] as const;

export type PersistedConfigFileName = (typeof PERSISTED_CONFIG_FILES)[number];

export function isPersistedConfigFileName(fileName: string): fileName is PersistedConfigFileName {
    return (PERSISTED_CONFIG_FILES as readonly string[]).includes(fileName);
}

export function assertPersistedConfigFileName(fileName: string): PersistedConfigFileName {
    if (!isPersistedConfigFileName(fileName)) {
        throw new Error(`Unknown persisted config file: ${fileName}`);
    }
    return fileName;
}
