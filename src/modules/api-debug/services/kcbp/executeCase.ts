import type { TabData } from '../../types/workspace';
import { parseKcbpAddress, serializeKcbpAddress } from '../../utils/kcbp/kcbpAddress';
import { paramsToCaseScript } from '../../utils/script/apiScript';
import { buildKcbpFields } from '../../utils/kcbp/kcbpFields';
import { resolveMsgtypeFromParams } from '../../utils/workspace/caseLabel';
import { mergeCommonParams } from '../../utils/workspace/commonParams';
import {
    KGBP_REQUIRED_FIELDS_MESSAGE,
    applyKcxpEnvironmentToAddress,
    isKgbpAddressReady,
} from '../../utils/workspace/kcxpEnvironment';
import { invokeKcbpWithFields } from './singleCall';
import { runScriptOrTcdCase } from './scriptRunner';
import {
    KCBP_MSGTYPE_REQUIRED_MESSAGE,
    type InvokeKcbpCallOptions,
    type KcbpCallOutcome,
    type KcbpInvokeMode,
    type RunNestedKcbpCase,
} from './types';

export async function invokeKcbpCall(
    tab: Pick<
        TabData,
        | 'address'
        | 'name'
        | 'params'
        | 'protocol'
        | 'script'
        | 'requestScript'
        | 'responseScript'
        | 'runInput'
    >,
    editorMode: KcbpInvokeMode = 'script',
    options: InvokeKcbpCallOptions = {},
): Promise<KcbpCallOutcome> {
    const runNestedCase: RunNestedKcbpCase = (nestedTab, nestedOptions) =>
        invokeKcbpCall(nestedTab, 'tcd', { ...nestedOptions, runNestedCase });
    const optionsWithRunner: InvokeKcbpCallOptions = options.runNestedCase
        ? options
        : { ...options, runNestedCase };
    const electronDeps = optionsWithRunner.electronDeps;
    let effectiveAddress =
        optionsWithRunner.effectiveAddress ??
        (optionsWithRunner.kcxpEnvironment
            ? applyKcxpEnvironmentToAddress(tab.address, optionsWithRunner.kcxpEnvironment)
            : tab.address);
    const addressParts = parseKcbpAddress(effectiveAddress);
    const msgtype = addressParts.msgtype.trim() || resolveMsgtypeFromParams(tab.params);
    if (!msgtype) {
        throw new Error(KCBP_MSGTYPE_REQUIRED_MESSAGE);
    }
    if (!addressParts.msgtype.trim()) {
        effectiveAddress = serializeKcbpAddress({ ...addressParts, msgtype });
    }

    // KGBP 必填字段拦截：缺失时不发请求，直接报错（单调用与脚本入口共用此门禁）
    if (tab.protocol === 'KGBP' && !isKgbpAddressReady(addressParts)) {
        throw new Error(KGBP_REQUIRED_FIELDS_MESSAGE);
    }

    if (editorMode === 'ui') {
        const effectiveParams = optionsWithRunner.commonParams
            ? mergeCommonParams(optionsWithRunner.commonParams, tab.params)
            : tab.params;
        const { fields, binaryFields } = buildKcbpFields(effectiveParams);
        const outcome = await invokeKcbpWithFields({
            tab,
            msgtype,
            fields,
            binaryFields,
            baseParams: tab.params,
            electronDeps,
            addressOverride: effectiveAddress,
        });
        return {
            ...outcome,
            effectiveParams,
            nextScript: outcome.missingParam
                ? paramsToCaseScript(outcome.nextParams, outcome.msgtype)
                : undefined,
        };
    }

    return runScriptOrTcdCase(tab, editorMode, msgtype, effectiveAddress, optionsWithRunner);
}
