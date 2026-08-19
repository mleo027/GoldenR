import type { ParamItem, TabData } from '../../types/workspace';
import type { KcbpRequestOptions, KcbpResponseData } from '../../../../types/kcbp';
import { requireElectronAPI } from '../../../../lib/electron';
import { parseKcbpAddress } from '../../utils/kcbp/kcbpAddress';
import { buildKcbpCallOutcome, buildKcbpRequest } from './requestMapper';
import type { KcbpCallOutcome, TcdElectronDeps } from './types';

export interface InvokeKcbpWithFieldsOptions {
    tab: Pick<TabData, 'address' | 'name' | 'params'>;
    msgtype: string;
    fields: Record<string, string>;
    binaryFields: Record<string, string>;
    baseParams: ParamItem[];
    electronDeps?: TcdElectronDeps;
    addressOverride?: string;
}

export async function invokeKcbpWithFields(
    options: InvokeKcbpWithFieldsOptions,
): Promise<KcbpCallOutcome> {
    const { tab, msgtype, fields, binaryFields, baseParams, electronDeps, addressOverride } =
        options;
    const callAddress = addressOverride ?? tab.address;
    const addressParts = parseKcbpAddress(callAddress);
    const payload: KcbpRequestOptions = buildKcbpRequest(
        addressParts,
        msgtype,
        fields,
        binaryFields,
    );
    const callKcbp = electronDeps?.callKcbp ?? requireElectronAPI().kcbp.call;
    const raw: KcbpResponseData = await callKcbp(payload);
    return buildKcbpCallOutcome({ params: baseParams }, callAddress, tab.name, raw);
}
