import { getElectronAPI, requireElectronAPI } from '@/lib/electron';
import type {
    KcbpPickPathResult,
    KcbpRequestOptions,
    KcbpResponseData,
    KcbpRuntimeConfig,
    TraceExecutionOptions,
} from '@/shared/kcbp/types';
import type { KcxpProtocol } from '@/shared/kcxp/types';
import type { DbConnectionConfig } from '@/shared/suggest/types';

export type ApiCallProtocol = KcxpProtocol;

export interface ApiCallRuntime {
    isAvailable(): boolean;
    call(request: KcbpRequestOptions): Promise<KcbpResponseData>;
    callWithTrace(
        request: KcbpRequestOptions,
        database: DbConnectionConfig,
        options: TraceExecutionOptions,
    ): Promise<KcbpResponseData>;
    cancel(): Promise<boolean>;
    getConfig(): Promise<KcbpRuntimeConfig>;
    saveConfig(config: KcbpRuntimeConfig): Promise<KcbpRuntimeConfig>;
    pickDirectory(defaultPath?: string): Promise<KcbpPickPathResult>;
    pickFile(defaultPath?: string): Promise<KcbpPickPathResult>;
}

export const apiCallRuntime: ApiCallRuntime = {
    isAvailable: () => Boolean(getElectronAPI()?.kcbp.call),
    call: (request) => requireElectronAPI().kcbp.call(request),
    callWithTrace: (request, database, options) =>
        requireElectronAPI().kcbp.callWithTrace(request, database, options),
    cancel: () => requireElectronAPI().kcbp.cancel(),
    getConfig: () => requireElectronAPI().kcbp.runtime.getConfig(),
    saveConfig: (config) => requireElectronAPI().kcbp.runtime.saveConfig(config),
    pickDirectory: (defaultPath) => requireElectronAPI().kcbp.runtime.pickDirectory(defaultPath),
    pickFile: (defaultPath) => requireElectronAPI().kcbp.runtime.pickFile(defaultPath),
};
