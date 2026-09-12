import type { CommonParamSet, CommonParamSetFile } from '../types/commonParams';
import { configStorage } from '../../../services/persistence/configStorage';
import { DebounceWriter } from '../../../services/persistence/debounceWriter';
import { UI_DEBOUNCE_MS } from '../../../constants/ui';

const SAVE_DEBOUNCE_MS = UI_DEBOUNCE_MS.save;

const setsWriter = new DebounceWriter<CommonParamSet[]>({
    write: (sets) => configStorage.writeCommonParams({ sets } satisfies CommonParamSetFile),
    delayMs: SAVE_DEBOUNCE_MS,
    onError: console.error,
});

function isParamItem(value: unknown): boolean {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof (value as { name?: unknown }).name === 'string' &&
        typeof (value as { value?: unknown }).value === 'string'
    );
}

function isCommonParamSet(value: unknown): value is CommonParamSet {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof (value as { id?: unknown }).id === 'string' &&
        typeof (value as { name?: unknown }).name === 'string' &&
        Array.isArray((value as { params?: unknown }).params) &&
        ((value as { params: unknown[] }).params as unknown[]).every(isParamItem)
    );
}

export function isCommonParamSetFile(value: unknown): value is CommonParamSetFile {
    return (
        typeof value === 'object' &&
        value !== null &&
        Array.isArray((value as { sets?: unknown }).sets) &&
        ((value as { sets: unknown[] }).sets as unknown[]).every(isCommonParamSet)
    );
}

export async function loadCommonParams(): Promise<CommonParamSet[]> {
    const raw: unknown = await configStorage.readCommonParams();
    return isCommonParamSetFile(raw) ? raw.sets : [];
}

export function saveCommonParams(sets: CommonParamSet[]): void {
    setsWriter.schedule(sets);
}
