import type {
    DbConnectionConfig,
    DbSuggestRequest,
    DbSuggestResponse,
} from '../types/paramSuggest';
import { requireElectronAPI } from '../../../lib/electron';

export async function testDbConnection(
    config: DbConnectionConfig,
): Promise<{ ok: boolean; error?: string }> {
    const api = requireElectronAPI();
    return api.testDbConnection(config);
}

export async function fetchParamSuggestions(request: DbSuggestRequest): Promise<DbSuggestResponse> {
    const api = requireElectronAPI();
    return api.suggestParamOptions(request);
}
