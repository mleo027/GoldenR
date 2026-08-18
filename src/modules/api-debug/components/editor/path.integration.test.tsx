// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppEnvProvider } from '../../../../store/appEnvStore';
import { UndoRedoProvider } from '../../../../platform/undo';
import { ApiDebugProviders } from '../../providers/ApiDebugProviders';
import { useActiveTab, useTabsActions, useTabsState } from '../../store/useTabs';
import { useApiDebugEnv } from '../../store/useApiDebugEnv';
import Path from './Path';

function AddressProbe() {
    const { activeTab } = useActiveTab();
    return <span data-testid="address">{activeTab.address}</span>;
}

function EnvSetupProbe() {
    const { patchEnv } = useApiDebugEnv();
    const { addCase } = useTabsActions();

    return (
        <button
            type="button"
            onClick={() => {
                patchEnv({
                    kcxpEnvironments: [
                        {
                            id: 'default-dev',
                            name: 'DEV',
                            host: '127.0.0.1:21000',
                            queue: 'req1',
                            timeout: '15',
                        },
                        {
                            id: 'env-test',
                            name: 'TEST',
                            host: '10.0.0.9:23000',
                            queue: 'req9',
                            timeout: '25',
                        },
                    ],
                    activeKcxpEnvironmentId: 'default-dev',
                });
                addCase(0);
            }}
        >
            setup-env
        </button>
    );
}

function AddressListProbe() {
    const { state } = useTabsState();
    return (
        <span data-testid="address-list">
            {state.projects.flatMap((project) => project.cases).map((caseItem) => caseItem.address)}
        </span>
    );
}

function renderPath() {
    return render(
        <AppEnvProvider>
            <UndoRedoProvider>
                <ApiDebugProviders>
                    <Path layout="full" hideRunButton />
                    <AddressProbe />
                    <EnvSetupProbe />
                    <AddressListProbe />
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
                saveIni: vi.fn(async () => ({ saved: false })),
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

    it('applies the selected environment to all cases from the request dropdown', async () => {
        const user = userEvent.setup();
        renderPath();

        await user.click(screen.getByRole('button', { name: 'setup-env' }));
        await waitFor(() => {
            expect(screen.getByTestId('address-list').textContent).toContain('127.0.0.1:21000');
        });

        await user.click(screen.getByText('DEV'));
        await user.click(await screen.findByText('TEST'));

        await waitFor(() => {
            const addresses = screen.getByTestId('address-list').textContent ?? '';
            expect(addresses).toContain('10.0.0.9:23000');
            expect(addresses).not.toContain('127.0.0.1:21000');
        });
    });
});
