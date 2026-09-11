import type { KcbpRequestOptions } from '../../../../types/kcbp';
import type { ParamItem, TabData } from '../../types/workspace';
import { parseKcbpAddress, serializeKcbpAddress } from '../../utils/kcbp/kcbpAddress';
import { paramsToCaseScript } from '../../utils/script/apiScript';
import { buildKcbpFields } from '../../utils/kcbp/kcbpFields';
import { resolveMsgtypeFromParams } from '../../utils/workspace/caseLabel';
import { mergeCommonParams } from '../../utils/workspace/commonParams';
import { applyKcxpEnvironmentToAddress } from '../../utils/workspace/kcxpEnvironment';
import { apiCallRuntime } from '../../../../runtime/apiCallFacade';
import { suggestRuntime } from '../../../../runtime/suggestFacade';
import { invokeKcbpWithFields } from './singleCall';
import { runScriptOrTcdCase } from './scriptRunner';
import {
    KCBP_MSGTYPE_REQUIRED_MESSAGE,
    type InvokeKcbpCallOptions,
    type KcbpCallOutcome,
    type KcbpInvokeMode,
    type TcdElectronDeps,
} from './types';

type ApiCaseTab = Pick<
    TabData,
    | 'address'
    | 'name'
    | 'params'
    | 'protocol'
    | 'script'
    | 'requestScript'
    | 'responseScript'
    | 'runInput'
>;

function resolveElectronDeps(options: InvokeKcbpCallOptions): TcdElectronDeps | undefined {
    if (options.electronDeps) return options.electronDeps;
    const databaseConfig = options.trace?.databaseConfig;
    if (!options.trace?.enabled || !databaseConfig) return undefined;
    return {
        callKcbp: (payload: KcbpRequestOptions) =>
            apiCallRuntime.callWithTrace(payload, databaseConfig, { enabled: true }),
        queryScriptSql: suggestRuntime.queryScript,
    };
}

function resolveAddressAndMsgtype(
    tab: ApiCaseTab,
    params: ParamItem[],
    options: InvokeKcbpCallOptions,
): { address: string; msgtype: string } {
    let address =
        options.effectiveAddress ??
        (options.kcxpEnvironment
            ? applyKcxpEnvironmentToAddress(tab.address, options.kcxpEnvironment)
            : tab.address);
    const parts = parseKcbpAddress(address);
    const msgtype = parts.msgtype.trim() || resolveMsgtypeFromParams(params);
    if (!msgtype) throw new Error(KCBP_MSGTYPE_REQUIRED_MESSAGE);
    if (!parts.msgtype.trim()) address = serializeKcbpAddress({ ...parts, msgtype });
    return { address, msgtype };
}

async function executeUiCase(
    tab: ApiCaseTab,
    params: ParamItem[],
    address: string,
    msgtype: string,
    electronDeps: TcdElectronDeps | undefined,
): Promise<KcbpCallOutcome> {
    const { fields, binaryFields } = buildKcbpFields(params);
    const outcome = await invokeKcbpWithFields({
        tab,
        msgtype,
        fields,
        binaryFields,
        baseParams: tab.params,
        electronDeps,
        addressOverride: address,
    });
    return {
        ...outcome,
        effectiveParams: params,
        nextScript: outcome.missingParam
            ? paramsToCaseScript(outcome.nextParams, outcome.msgtype)
            : undefined,
    };
}

export async function executeApiCase(
    tab: ApiCaseTab,
    editorMode: KcbpInvokeMode = 'script',
    options: InvokeKcbpCallOptions = {},
): Promise<KcbpCallOutcome> {
    const params = options.commonParams
        ? mergeCommonParams(options.commonParams, tab.params)
        : tab.params;
    const { address, msgtype } = resolveAddressAndMsgtype(tab, params, options);
    if (editorMode === 'ui') {
        return executeUiCase(tab, params, address, msgtype, resolveElectronDeps(options));
    }
    return runScriptOrTcdCase(tab, editorMode, msgtype, address, options);
}
