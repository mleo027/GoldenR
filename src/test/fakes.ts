import { vi } from 'vitest';
import type { KcbpRequestOptions, KcbpResponseData } from '@/types/kcbp';
import type { DbScriptQueryRequest, DbScriptQueryResponse } from '@/shared/suggest/types';
import type { ConfigStorageFileName } from '@/shared/config/files';
import type { PersistedWorkspace } from '@/modules/api-debug/types/workspace';
import { createKcbpRequest, createKcbpResponse, createWorkspace } from './factories';

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

export function createFakeKcbpPort(initialResponse = createKcbpResponse()) {
    const calls: KcbpRequestOptions[] = [];
    let response = initialResponse;
    let error: unknown;
    let delayMs = 0;

    return {
        calls,
        setResponse(next: KcbpResponseData) {
            response = next;
        },
        setError(next: unknown) {
            error = next;
        },
        setDelay(next: number) {
            delayMs = next;
        },
        async call(payload: KcbpRequestOptions): Promise<KcbpResponseData> {
            calls.push(payload);
            if (delayMs > 0) await sleep(delayMs);
            if (error) throw error;
            return response;
        },
        reset() {
            calls.length = 0;
            response = initialResponse;
            error = undefined;
            delayMs = 0;
        },
    };
}

export function createFakeSqlQueryPort() {
    const calls: DbScriptQueryRequest[] = [];
    let response: DbScriptQueryResponse = { rows: [], columns: [] };
    let error: unknown;
    let delayMs = 0;

    return {
        calls,
        setResponse(next: DbScriptQueryResponse) {
            response = next;
        },
        setError(next: unknown) {
            error = next;
        },
        setDelay(next: number) {
            delayMs = next;
        },
        async queryScript(request: DbScriptQueryRequest): Promise<DbScriptQueryResponse> {
            calls.push(request);
            if (delayMs > 0) await sleep(delayMs);
            if (error) throw error;
            return response;
        },
        reset() {
            calls.length = 0;
            response = { rows: [], columns: [] };
            error = undefined;
            delayMs = 0;
        },
    };
}

export function createFakeConfigRepository(initial: Record<string, unknown> = {}) {
    const files = new Map<string, unknown>(Object.entries(initial));
    const calls: { type: 'read' | 'write'; name: string }[] = [];

    return {
        files,
        calls,
        async read(name: ConfigStorageFileName): Promise<unknown | null> {
            calls.push({ type: 'read', name });
            return files.get(name) ?? null;
        },
        async write(name: ConfigStorageFileName, data: unknown): Promise<void> {
            calls.push({ type: 'write', name });
            files.set(name, data);
        },
        reset() {
            files.clear();
            calls.length = 0;
        },
    };
}

export function createFakeWorkspaceRepository(initial = createWorkspace()) {
    let workspace = initial;
    let writeCount = 0;

    return {
        getWorkspace: () => workspace,
        writeCount: () => writeCount,
        async load(): Promise<PersistedWorkspace> {
            return workspace;
        },
        async save(next: PersistedWorkspace): Promise<void> {
            workspace = next;
            writeCount += 1;
        },
        reset() {
            workspace = initial;
            writeCount = 0;
        },
    };
}

export function createFakeAppLifecycle() {
    let flushHandler: (() => void | Promise<void>) | undefined;
    const flushCalls: string[] = [];

    return {
        flushCalls,
        onFlushStorage: vi.fn((callback: () => void | Promise<void>) => {
            flushHandler = callback;
            return () => {
                flushHandler = undefined;
            };
        }),
        async triggerFlush(): Promise<void> {
            flushCalls.push('flush');
            await flushHandler?.();
        },
        reset() {
            flushHandler = undefined;
            flushCalls.length = 0;
        },
    };
}

export const fakeRequest = createKcbpRequest;
export const fakeResponse = createKcbpResponse;
