import type { ApiDebugEnv } from '@/modules/api-debug/types';
import {
    DEFAULT_KCXP_ENVIRONMENTS,
    DEFAULT_KCXP_ENVIRONMENT_ID,
} from '@/modules/api-debug/constants/kcxpEnv';

export const DEFAULT_API_DEBUG_ENV: ApiDebugEnv = {
    editorMode: 'ui',
    kcxpEnvironments: DEFAULT_KCXP_ENVIRONMENTS,
    activeKcxpEnvironmentId: DEFAULT_KCXP_ENVIRONMENT_ID,
};
