import { beforeEach, describe, expect, it, vi } from 'vitest';

const bridge = vi.hoisted(() => ({
    importExport: {
        saveCsv: vi.fn(),
        saveTxt: vi.fn(),
        saveHtml: vi.fn(),
        saveIni: vi.fn(),
        openImportFile: vi.fn(),
        openParamFile: vi.fn(),
        statParamFile: vi.fn(),
    },
    database: {
        testConnection: vi.fn(),
        suggest: vi.fn(),
        queryScript: vi.fn(),
        reloadSuggestConfig: vi.fn(),
    },
    config: { read: vi.fn(), write: vi.fn(), flush: vi.fn() },
}));

vi.mock('@/lib/electron', () => ({
    getElectronAPI: () => bridge,
    requireElectronAPI: () => bridge,
}));

import { configRuntime } from './configFacade';
import { importExportRuntime } from './importExportFacade';
import { suggestRuntime } from './suggestFacade';

describe('runtime facades', () => {
    beforeEach(() => {
        for (const group of Object.values(bridge)) {
            for (const method of Object.values(group)) method.mockReset();
        }
    });

    it('reports availability and forwards import/export operations', async () => {
        bridge.importExport.saveCsv.mockResolvedValue({ saved: true });
        expect(importExportRuntime.isAvailable()).toBe(true);
        await expect(importExportRuntime.saveCsv('csv', 'file.csv')).resolves.toEqual({
            saved: true,
        });
        expect(bridge.importExport.saveCsv).toHaveBeenCalledWith('csv', 'file.csv');
    });

    it('forwards suggest and config calls and preserves bridge errors', async () => {
        bridge.database.suggest.mockRejectedValue(new Error('db failed'));
        await expect(suggestRuntime.suggest({} as never)).rejects.toThrow('db failed');

        bridge.config.read.mockResolvedValue({ value: 1 });
        await expect(configRuntime.read('settings.json')).resolves.toEqual({ value: 1 });
        expect(bridge.config.read).toHaveBeenCalledWith('settings.json');
    });

    it('reports unavailable optional bridges', async () => {
        const original = bridge.importExport;
        bridge.importExport = undefined as never;
        expect(importExportRuntime.isAvailable()).toBe(false);
        await expect(importExportRuntime.saveCsv('csv', 'file.csv')).rejects.toThrow(
            'Import/export runtime is unavailable',
        );
        bridge.importExport = original;
    });
});
