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
