// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppEnvProvider } from '../../../../store/appEnvStore';
import { UndoRedoProvider } from '../../../../platform/undo';
import { ApiDebugProviders } from '../../providers/ApiDebugProviders';
import { useActiveTab } from '../../store/useTabs';
import Path from './Path';

function AddressProbe() {
    const { activeTab } = useActiveTab();
    return <span data-testid="address">{activeTab.address}</span>;
}

function renderPath() {
    return render(
        <AppEnvProvider>
            <UndoRedoProvider>
                <ApiDebugProviders>
                    <Path layout="full" hideRunButton />
                    <AddressProbe />
                </ApiDebugProviders>
            </UndoRedoProvider>
        </AppEnvProvider>,
    );
}

function stubElectronApi() {
    Object.defineProperty(window, 'electronAPI', {
        configurable: true,
        value: {
            config: {
                read: vi.fn(async () => null),
                write: vi.fn(async () => undefined),
                flush: vi.fn(async () => undefined),
            },
            kcbp: {
                call: vi.fn(async () => ({
                    code: '0',
                    msg: 'ok',
                    data: [],
                    stats: { timecost: 1, rows: 0 },
                })),
                cancel: vi.fn(async () => true),
                runtime: {
                    getConfig: vi.fn(async () => ({ executable: '', workingDir: '', args: [] })),
                    saveConfig: vi.fn(async () => ({
                        executable: '',
                        workingDir: '',
                        args: [],
                    })),
                    pickDirectory: vi.fn(async () => ({ canceled: true })),
                    pickFile: vi.fn(async () => ({ canceled: true })),
                },
            },
            database: {
                testConnection: vi.fn(async () => ({ ok: true })),
                suggest: vi.fn(async () => ({ options: [] })),
                queryScript: vi.fn(async () => ({ rows: [], columns: [] })),
                reloadSuggestConfig: vi.fn(async () => undefined),
            },
            importExport: {
                saveCsv: vi.fn(async () => ({ saved: false })),
                saveHtml: vi.fn(async () => ({ saved: false })),
                openImportFile: vi.fn(async () => ({ opened: false })),
                openParamFile: vi.fn(async () => ({ opened: false })),
                statParamFile: vi.fn(async () => ({ exists: false, error: 'missing' })),
            },
            window: {
                minimize: vi.fn(async () => undefined),
                toggleMaximize: vi.fn(async () => false),
                isMaximized: vi.fn(async () => false),
                onMaximizedChange: vi.fn(() => () => undefined),
            },
            app: {
                getUserDataDir: vi.fn(async () => ''),
                onFlushStorage: vi.fn(() => () => undefined),
            },
        },
    });
}

describe('Path integration', () => {
    beforeEach(() => {
        stubElectronApi();
    });

    afterEach(() => {
        cleanup();
        delete (window as { electronAPI?: unknown }).electronAPI;
    });

    it('debounces host edits and commits the serialized address', async () => {
        const user = userEvent.setup();
        renderPath();

        const hostInput = screen.getByPlaceholderText('127.0.0.1:21000');
        await user.clear(hostInput);
        await user.type(hostInput, '127.0.0.2:22000');

        await waitFor(
            () => {
                expect(screen.getByTestId('address').textContent).toContain('127.0.0.2:22000');
            },
            { timeout: 3000 },
        );
    });
});
