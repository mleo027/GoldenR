import type { DbConnectionConfig, DbScriptQueryResponse } from '@/shared/suggest/types';
import { suggestRuntime } from '../../../../runtime/suggestFacade';
import { fieldsToParams, normalizeRequestScriptResult } from '../../utils/script/apiScript';
import type { createScriptConsole } from '../../utils/script/scriptConsole';
import { invokeKcbpWithFields } from './singleCall';
import type { ScriptCaseTab, ScriptExecutionState } from './scriptRuntimeTypes';
import type { ApiDebugElectronDeps } from './types';

interface ScriptCallConfig {
    tab: ScriptCaseTab;
    msgtype: string;
    address: string;
    electronDeps?: ApiDebugElectronDeps;
    interpolate(value: string): string;
    consoleCapture: ReturnType<typeof createScriptConsole>;
    state: ScriptExecutionState;
}

function interpolateFields(fields: Record<string, string>, interpolate: (value: string) => string) {
    for (const [key, value] of Object.entries(fields)) {
        if (value.includes('${')) fields[key] = interpolate(value);
    }
}

export function createScriptCall(config: ScriptCallConfig) {
    return async (input: Record<string, string | { file: string }>) => {
        const normalized = normalizeRequestScriptResult(input);
        interpolateFields(normalized.fields, config.interpolate);
        config.state.activeParams =
            normalized.params.length > 0
                ? normalized.params
                : fieldsToParams(normalized.fields, normalized.binaryFields);
        const callMsgtype =
            normalized.fields.g_funcid?.trim() ||
            normalized.fields.g_funcid_src?.trim() ||
            config.msgtype;
        const outcome = await invokeKcbpWithFields({
            tab: config.tab,
            msgtype: callMsgtype,
            fields: normalized.fields,
            binaryFields: normalized.binaryFields,
            baseParams: config.state.activeParams,
            electronDeps: config.electronDeps,
            addressOverride: config.address,
        });
        config.state.lastOutcome = outcome;
        return outcome.response;
    };
}

export function createScriptQuery(
    electronDeps: ApiDebugElectronDeps | undefined,
    databaseConfig: DbConnectionConfig | undefined,
) {
    return async (sql: string, params?: Record<string, string | number>) => {
        const query = electronDeps?.queryScriptSql ?? suggestRuntime.queryScript;
        const result: DbScriptQueryResponse = await query({ sql, params, databaseConfig });
        if (result.error) throw new Error(result.error);
        return result.rows;
    };
}
