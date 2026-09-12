import type { KcxpEnvironment } from '@/shared/kcxp/types';
import { configStorage } from '@/services/persistence/configStorage';

export async function loadAutomationEnvironments(): Promise<KcxpEnvironment[]> {
    const stored = await configStorage.readApiDebugEnvironments();
    if (!stored || typeof stored !== 'object') return [];
    const environments = (stored as { kcxpEnvironments?: unknown }).kcxpEnvironments;
    if (!Array.isArray(environments)) return [];
    return environments.filter(
        (item): item is KcxpEnvironment =>
            Boolean(item) &&
            typeof item === 'object' &&
            typeof (item as KcxpEnvironment).id === 'string' &&
            typeof (item as KcxpEnvironment).name === 'string',
    );
}
