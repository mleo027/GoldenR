import type { KcxpEnvironment } from '../types/kcxp';
import { DEFAULT_KCBP_QUEUE, DEFAULT_KCBP_TIMEOUT } from '../utils/kcbp/kcbpAddress';
import { DEFAULT_DB_CONFIG } from './paramSuggest';

export const DEFAULT_KCXP_ENVIRONMENT_ID = 'default-dev';

export const DEFAULT_KCXP_ENVIRONMENTS: KcxpEnvironment[] = [
    {
        id: DEFAULT_KCXP_ENVIRONMENT_ID,
        name: 'DEV',
        protocol: 'KCBP',
        host: '127.0.0.1:21000',
        queue: DEFAULT_KCBP_QUEUE,
        timeout: DEFAULT_KCBP_TIMEOUT,
        database: { ...DEFAULT_DB_CONFIG },
    },
];
