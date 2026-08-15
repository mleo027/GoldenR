import { flushPendingApiDebugEnvSaveAsync } from './store/apiDebugEnvData';
import { flushPendingParamSuggestSaveAsync } from './store/paramSuggestData';
import { flushPendingSavesAsync } from './store/tabsData';
import { flushWorkspaceDrafts } from './store/workspaceFlushRegistry';

export async function flushApiDebugPersistedState(): Promise<void> {
    const results = await Promise.allSettled([
        flushWorkspaceDrafts(),
        flushPendingSavesAsync(),
        flushPendingApiDebugEnvSaveAsync(),
        flushPendingParamSuggestSaveAsync(),
    ]);
    const errors = results
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map((result) => result.reason);
    if (errors.length > 0) {
        throw new Error(`ApiDebug persisted state flush failed: ${errors.map(String).join('; ')}`);
    }
}
