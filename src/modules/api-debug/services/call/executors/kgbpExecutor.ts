import { parseKcbpAddress } from '../../../utils/kcbp/kcbpAddress';
import {
    KGBP_REQUIRED_FIELDS_MESSAGE,
    applyKcxpEnvironmentToAddress,
    isKgbpAddressReady,
} from '../../../utils/workspace/kcxpEnvironment';
import { executeApiCase } from '../../kcbp/executeCase';
import type { ApiCallExecutor } from './types';

export const executeKgbp: ApiCallExecutor = async (tab, mode, options) => {
    const address =
        options.effectiveAddress ??
        (options.kcxpEnvironment
            ? applyKcxpEnvironmentToAddress(tab.address, options.kcxpEnvironment)
            : tab.address);
    if (!isKgbpAddressReady(parseKcbpAddress(address))) {
        throw new Error(KGBP_REQUIRED_FIELDS_MESSAGE);
    }
    return executeApiCase(tab, mode, options);
};
