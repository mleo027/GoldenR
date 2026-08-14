import { flushPendingApiDebugEnvSave } from './store/apiDebugEnvData';
import { flushPendingParamSuggestSave } from './store/paramSuggestData';
import { flushPendingSaves } from './store/tabsData';
import { flushAllTabDrafts } from './utils/workspace/tabDraftRegistry';

export function flushApiDebugPersistedState(): void {
    flushAllTabDrafts();
    flushPendingSaves();
    flushPendingApiDebugEnvSave();
    flushPendingParamSuggestSave();
}
