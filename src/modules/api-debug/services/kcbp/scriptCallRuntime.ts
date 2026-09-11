import type { DbConnectionConfig, DbScriptQueryResponse } from '@/shared/suggest/types';
import { suggestRuntime } from '../../../../runtime/suggestFacade';
import { fieldsToParams, normalizeRequestScriptResult } from '../../utils/script/apiScript';
import type { createScriptConsole } from '../../utils/script/scriptConsole';
import { invokeKcbpWithFields } from './singleCall';
import type { ScriptCaseTab, ScriptExecutionState } from './scriptRuntimeTypes';
import type { TcdElectronDeps } from './types';

interface ScriptCallConfig {
    tab: ScriptCaseTab;
    msgtype: string;
    address: string;
    electronDeps?: TcdElectronDeps;
    isTcd: boolean;
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
        if (config.isTcd) interpolateFields(normalized.fields, config.interpolate);
        config.state.activeParams =
            normalized.params.length > 0
                ? normalized.params
                : fieldsToParams(normalized.fields, normalized.binaryFields);
        const callMsgtype =
            normalized.fields.g_funcid?.trim() ||
            normalized.fields.g_funcid_src?.trim() ||
            config.msgtype;
        const startedAt = Date.now();
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
        const step = {
            index: ++config.state.callCounter,
            msgtype: callMsgtype,
            fields: { ...normalized.fields },
            response: outcome.response,
            durationMs: Date.now() - startedAt,
        };
        config.state.callSteps.push(step);
        if (config.isTcd) {
            const rows =
                outcome.response.stats?.rows ??
                outcome.response.resultSets.reduce((total, set) => total + set.rows.length, 0);
            config.consoleCapture.append(
                'log',
                `[call #${step.index}] ${step.msgtype} → code=${outcome.response.code} rows=${rows} ${step.durationMs}ms`,
            );
        }
        return outcome.response;
    };
}

export function createScriptQuery(
    electronDeps: TcdElectronDeps | undefined,
    databaseConfig: DbConnectionConfig | undefined,
) {
    return async (sql: string, params?: Record<string, string | number>) => {
        const query = electronDeps?.queryScriptSql ?? suggestRuntime.queryScript;
        const result: DbScriptQueryResponse = await query({ sql, params, databaseConfig });
        if (result.error) throw new Error(result.error);
        return result.rows;
    };
}
