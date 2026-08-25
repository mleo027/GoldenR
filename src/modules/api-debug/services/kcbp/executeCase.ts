import type { TabData } from '../../types/workspace';
import { parseKcbpAddress, serializeKcbpAddress } from '../../utils/kcbp/kcbpAddress';
import { paramsToCaseScript } from '../../utils/script/apiScript';
import { buildKcbpFields } from '../../utils/kcbp/kcbpFields';
import { resolveMsgtypeFromParams } from '../../utils/workspace/caseLabel';
import { applyKcxpEnvironmentToAddress } from '../../utils/workspace/kcxpEnvironment';
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

    if (editorMode === 'ui') {
        const { fields, binaryFields } = buildKcbpFields(tab.params);
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
            nextScript: outcome.missingParam
                ? paramsToCaseScript(outcome.nextParams, outcome.msgtype)
                : undefined,
        };
    }

    return runScriptOrTcdCase(tab, editorMode, msgtype, effectiveAddress, optionsWithRunner);
}
