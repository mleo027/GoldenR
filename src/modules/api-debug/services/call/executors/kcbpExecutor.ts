import { executeApiCase } from '../../kcbp/executeCase';
import type { ApiCallExecutor } from './types';

export const executeKcbp: ApiCallExecutor = (tab, mode, options) =>
    executeApiCase(tab, mode, options);
