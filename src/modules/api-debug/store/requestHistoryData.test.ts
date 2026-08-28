import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RequestHistoryEntry } from '../types/requestHistory';
import {
    flushRequestHistoryAsync,
    loadRequestHistory,
    saveRequestHistory,
} from './requestHistoryData';

const entry: RequestHistoryEntry = {
    id: 'history-1',
    timestamp: 1,
    projectName: 'Project 1',
    caseName: 'Case 1',
    mode: 'ui',
    request: {
        address: '127.0.0.1:21000/150501',
        msgtype: '150501',
        params: [],
    },
    response: {
        code: '0',
        message: 'ok',
        resultSets: [{ name: '', rows: [{ market: '1' }] }],
    },
    outcome: {
        success: true,
    },
};

afterEach(() => {
    void flushRequestHistoryAsync();
    vi.unstubAllGlobals();
});

function stubElectronApi(readResult: unknown) {
    vi.stubGlobal('window', {
        electronAPI: {
            config: {
                read: vi.fn(async (fileName: string) =>
                    fileName === 'request-history.json' ? readResult : null,
                ),
                write: vi.fn(async () => undefined),
            },
        },
    });
}

describe('requestHistoryData', () => {
    it('loads persisted history entries', async () => {
        stubElectronApi({ version: 1, entries: [entry] });

        await expect(loadRequestHistory()).resolves.toEqual([entry]);
    });

    it('migrates legacy response data when loading history', async () => {
        const legacyEntry = {
            ...entry,
            response: {
                code: '0',
                message: 'ok',
                data: [{ market: '1' }],
            },
        };
        stubElectronApi({ version: 1, entries: [legacyEntry] });

        await expect(loadRequestHistory()).resolves.toEqual([entry]);
    });

    it('returns an empty list for missing or invalid history files', async () => {
        stubElectronApi(null);
        await expect(loadRequestHistory()).resolves.toEqual([]);

        stubElectronApi({ version: 1, entries: [{ id: 1 }] });
        await expect(loadRequestHistory()).resolves.toEqual([]);
    });

    it('persists history through the config storage port', async () => {
        const write = vi.fn(async () => undefined);
        vi.stubGlobal('window', {
            electronAPI: {
                config: {
                    read: vi.fn(async () => null),
                    write,
                },
            },
        });

        saveRequestHistory([entry]);
        await flushRequestHistoryAsync();

        expect(write).toHaveBeenCalledWith('request-history.json', {
            version: 2,
            entries: [entry],
        });
    });
});
