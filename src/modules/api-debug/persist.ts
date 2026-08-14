import { flushPendingApiDebugEnvSaveAsync } from './store/apiDebugEnvData';
import { flushPendingParamSuggestSaveAsync } from './store/paramSuggestData';
import { flushPendingSavesAsync } from './store/tabsData';
import { flushAllTabDrafts } from './utils/workspace/tabDraftRegistry';

export async function flushApiDebugPersistedState(): Promise<void> {
    flushAllTabDrafts();
    await flushPendingSavesAsync();
    await flushPendingApiDebugEnvSaveAsync();
    await flushPendingParamSuggestSaveAsync();
}
