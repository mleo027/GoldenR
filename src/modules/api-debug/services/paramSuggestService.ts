import type {
    DbConnectionConfig,
    DbSuggestRequest,
    DbSuggestResponse,
} from '../types/paramSuggest';
import { suggestRuntime } from '../../../runtime/suggestFacade';

export async function testDbConnection(
    config: DbConnectionConfig,
): Promise<{ ok: boolean; error?: string }> {
    return suggestRuntime.testConnection(config);
}

export async function fetchParamSuggestions(request: DbSuggestRequest): Promise<DbSuggestResponse> {
    return suggestRuntime.suggest(request);
}
