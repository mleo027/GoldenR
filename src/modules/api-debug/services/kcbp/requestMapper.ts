import type { TabData } from '../../types/workspace';
import type { KcbpResponseData } from '../../../../types/kcbp';
import { parseKcbpAddress } from '../../utils/kcbp/kcbpAddress';
import {
    extractMissingParamFromKcbpResponse,
    mergeParamIntoList,
} from '../../utils/kcbp/kcbpParams';
import { parseKcbpResponseStatus } from '../../utils/kcbp/kcbpResponse';
import type { KcbpCallOutcome } from './types';

export { buildEnabledParamFields, buildKcbpFields } from '../../utils/kcbp/kcbpFields';

export function buildKcbpCallOutcome(
    tab: Pick<TabData, 'params'>,
    address: string,
    fallbackName: string,
    raw: KcbpResponseData,
): KcbpCallOutcome {
    const msgtype = parseKcbpAddress(address).msgtype.trim() || fallbackName;
    const response: KcbpCallOutcome['response'] = {
        code: raw.code,
        message: raw.msg,
        resultSets: raw.data,
        stats: raw.stats,
        calledAt: Date.now(),
        trace: raw.trace,
    };

    const missingParam = extractMissingParamFromKcbpResponse(raw.code, raw.msg, raw.data);
    const nextParams = missingParam
        ? mergeParamIntoList(tab.params, missingParam.name, missingParam.value)
        : tab.params;

    return {
        response,
        nextParams,
        status: parseKcbpResponseStatus(response),
        missingParam,
        msgtype,
    };
}
