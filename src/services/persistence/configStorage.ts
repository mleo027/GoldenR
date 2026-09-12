import { getElectronAPI } from '@/lib/electron';
export interface ConfigStoragePort {
    readAppEnv(): Promise<unknown | null>;
    writeAppEnv(data: unknown): Promise<void>;
    readWorkspace(): Promise<unknown | null>;
    writeWorkspace(data: unknown): Promise<void>;
    readProjects(): Promise<unknown | null>;
    writeProjects(data: unknown): Promise<void>;
    readCommonParams(): Promise<unknown | null>;
    writeCommonParams(data: unknown): Promise<void>;
    readApiDebugEnvironments(): Promise<unknown | null>;
    writeApiDebugEnvironments(data: unknown): Promise<void>;
    readDbConnection(): Promise<unknown | null>;
    writeDbConnection(data: unknown): Promise<void>;
    readParamSuggestRules(): Promise<unknown | null>;
    writeParamSuggestRules(data: unknown): Promise<void>;
    readKcbpRuntimeConfig(): Promise<unknown | null>;
    writeKcbpRuntimeConfig(data: unknown): Promise<void>;
    readRequestHistory(): Promise<unknown | null>;
    writeRequestHistory(data: unknown): Promise<void>;
}

export function createElectronConfigStoragePort(): ConfigStoragePort {
    return {
        async readAppEnv() {
            return getElectronAPI()?.config.readAppEnv() ?? null;
        },
        async writeAppEnv(data) {
            await getElectronAPI()?.config.writeAppEnv(data);
        },
        async readWorkspace() {
            return getElectronAPI()?.config.readWorkspace() ?? null;
        },
        async writeWorkspace(data) {
            await getElectronAPI()?.config.writeWorkspace(data);
        },
        async readProjects() {
            return getElectronAPI()?.config.readProjects() ?? null;
        },
        async writeProjects(data) {
            await getElectronAPI()?.config.writeProjects(data);
        },
        async readCommonParams() {
            return getElectronAPI()?.config.readCommonParams() ?? null;
        },
        async writeCommonParams(data) {
            await getElectronAPI()?.config.writeCommonParams(data);
        },
        async readApiDebugEnvironments() {
            return getElectronAPI()?.config.readApiDebugEnvironments() ?? null;
        },
        async writeApiDebugEnvironments(data) {
            await getElectronAPI()?.config.writeApiDebugEnvironments(data);
        },
        async readDbConnection() {
            return getElectronAPI()?.config.readDbConnection() ?? null;
        },
        async writeDbConnection(data) {
            await getElectronAPI()?.config.writeDbConnection(data);
        },
        async readParamSuggestRules() {
            return getElectronAPI()?.config.readParamSuggestRules() ?? null;
        },
        async writeParamSuggestRules(data) {
            await getElectronAPI()?.config.writeParamSuggestRules(data);
        },
        async readKcbpRuntimeConfig() {
            return getElectronAPI()?.config.readKcbpRuntimeConfig() ?? null;
        },
        async writeKcbpRuntimeConfig(data) {
            await getElectronAPI()?.config.writeKcbpRuntimeConfig(data);
        },
        async readRequestHistory() {
            return getElectronAPI()?.config.readRequestHistory() ?? null;
        },
        async writeRequestHistory(data) {
            await getElectronAPI()?.config.writeRequestHistory(data);
        },
    };
}

export const configStorage: ConfigStoragePort = createElectronConfigStoragePort();
