import type { ParamItem, TabData } from '../../types/workspace';
import type { KcbpRequestOptions, KcbpResponseData } from '../../../../types/kcbp';
import { apiCallRuntime } from '../../../../runtime/apiCallFacade';
import { parseKcbpAddress } from '../../utils/kcbp/kcbpAddress';
import { buildApiRequest } from '../call/requestMappers';
import { buildKcbpCallOutcome } from './requestMapper';
import type { KcbpCallOutcome, TcdElectronDeps } from './types';

export interface InvokeKcbpWithFieldsOptions {
    tab: Pick<TabData, 'address' | 'name' | 'params' | 'protocol'>;
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
    const payload: KcbpRequestOptions = buildApiRequest(
        addressParts,
        msgtype,
        fields,
        binaryFields,
        tab.protocol,
    );
    const callKcbp = electronDeps?.callKcbp ?? apiCallRuntime.call;
    const raw: KcbpResponseData = await callKcbp(payload);
    return buildKcbpCallOutcome({ params: baseParams }, callAddress, tab.name, raw);
}
