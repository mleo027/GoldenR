import { REQUEST_HISTORY_FILE } from '@/config/files';
import { UI_DEBOUNCE_MS } from '../../../constants/ui';
import { configStorage } from '../../../services/persistence/configStorage';
import { DebounceWriter } from '../../../services/persistence/debounceWriter';
import type {
    RequestHistoryEntry,
    RequestHistoryFile,
    RequestHistoryMode,
} from '../types/requestHistory';

export const MAX_REQUEST_HISTORY = 500;

const historyWriter = new DebounceWriter<RequestHistoryFile>({
    write: (file) => configStorage.write(REQUEST_HISTORY_FILE, file),
    delayMs: UI_DEBOUNCE_MS.save,
    onError: console.error,
});

function isParamItem(value: unknown): boolean {
    if (!value || typeof value !== 'object') return false;
    const item = value as { name?: unknown; value?: unknown; type?: unknown };
    return (
        typeof item.name === 'string' &&
        typeof item.value === 'string' &&
        (item.type === 'string' || item.type === 'file' || item.type === 'disabled')
    );
}

function isResponseData(value: unknown): boolean {
    if (!value || typeof value !== 'object') return false;
    const response = value as { code?: unknown; message?: unknown; data?: unknown };
    return (
        (typeof response.code === 'string' || typeof response.code === 'number') &&
        typeof response.message === 'string' &&
        Array.isArray(response.data)
    );
}

function isRequestSnapshot(value: unknown): boolean {
    if (!value || typeof value !== 'object') return false;
    const request = value as {
        address?: unknown;
        msgtype?: unknown;
        params?: unknown;
    };
    return (
        typeof request.address === 'string' &&
        typeof request.msgtype === 'string' &&
        Array.isArray(request.params) &&
        request.params.every(isParamItem)
    );
}

function isRequestHistoryMode(value: unknown): value is RequestHistoryMode {
    const mode = value;
    return mode === 'ui' || mode === 'script' || mode === 'tcd';
}

function isRequestHistoryEntry(value: unknown): value is RequestHistoryEntry {
    if (!value || typeof value !== 'object') return false;
    const entry = value as Partial<RequestHistoryEntry>;
    return (
        typeof entry.id === 'string' &&
        typeof entry.timestamp === 'number' &&
        typeof entry.projectName === 'string' &&
        typeof entry.caseName === 'string' &&
        isRequestSnapshot(entry.request) &&
        isResponseData(entry.response) &&
        isRequestHistoryMode(entry.mode)
    );
}

function isRequestHistoryFile(value: unknown): value is RequestHistoryFile {
    if (!value || typeof value !== 'object') return false;
    const file = value as Partial<RequestHistoryFile>;
    return Array.isArray(file.entries) && file.entries.every(isRequestHistoryEntry);
}

export async function loadRequestHistory(): Promise<RequestHistoryEntry[]> {
    const raw = await configStorage.read(REQUEST_HISTORY_FILE, false);
    if (!isRequestHistoryFile(raw)) return [];
    return raw.entries.slice(0, MAX_REQUEST_HISTORY);
}

export function saveRequestHistory(entries: RequestHistoryEntry[]): void {
    historyWriter.schedule({
        version: 1,
        entries: entries.slice(0, MAX_REQUEST_HISTORY),
    });
}

export async function flushRequestHistoryAsync(): Promise<void> {
    await historyWriter.flush();
}

export function createRequestHistoryId(timestamp = Date.now()): string {
    return `${timestamp}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createRequestHistoryMode(mode: string): RequestHistoryMode {
    return mode === 'script' || mode === 'tcd' ? mode : 'ui';
}
