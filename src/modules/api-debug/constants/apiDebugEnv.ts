export const API_DEBUG_MODULE_ID = 'api-debug';

import type { ApiDebugEnv } from '../types';
import { DEFAULT_KCXP_ENVIRONMENTS, DEFAULT_KCXP_ENVIRONMENT_ID } from './kcxpEnv';

export const DEFAULT_API_DEBUG_ENV: ApiDebugEnv = {
    editorMode: 'ui',
    kcxpEnvironments: DEFAULT_KCXP_ENVIRONMENTS,
    activeKcxpEnvironmentId: DEFAULT_KCXP_ENVIRONMENT_ID,
    paramsRawMode: false,
};
