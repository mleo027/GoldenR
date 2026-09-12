// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { KcbpResponseData } from '../../../types/kcbp';
import { useApiCall } from '../hooks/useApiCall';
import { useApiDebugEnv } from '../store/useApiDebugEnv';
import { useApiDebugEnvStore } from '../store/apiDebugEnvStore';
import { ApiDebugProviders } from './ApiDebugProviders';
import { registerTabDraftReader } from '../utils/workspace/tabDraftRegistry';

const successRaw: KcbpResponseData = {
    code: '0',
    msg: 'ok',
    data: [{ name: '', rows: [{ custid: '1' }] }],
    stats: { timecost: 12, rows: 1 },
};

const mockCallKcbp = vi.fn();
const mockCancelKcbp = vi.fn();
const mockConfigWrite = vi.fn<(data: unknown) => Promise<void>>(async () => undefined);

function Harness() {
    const { loading, run, cancel } = useApiCall();
    const { env } = useApiDebugEnv();
    return (
        <div>
            <button type="button" onClick={() => void run()}>
                run
            </button>
            <button type="button" onClick={cancel}>
                cancel
            </button>
            <span>{loading ? 'loading' : 'idle'}</span>
            <span data-testid="editor-mode">{env.editorMode}</span>
        </div>
    );
}

function renderProviders(children: ReactNode) {
    return render(<ApiDebugProviders>{children}</ApiDebugProviders>);
}

function stubElectronApi(options: { configRead?: () => Promise<unknown> } = {}) {
    Object.defineProperty(window, 'electronAPI', {
        configurable: true,
        value: {
            config: {
                readAppEnv: vi.fn(async () => null),
                writeAppEnv: vi.fn(async () => undefined),
                readProjects: vi.fn(async () => null),
                writeProjects: vi.fn(async () => undefined),
                readWorkspace: vi.fn(async () => null),
                writeWorkspace: vi.fn(async () => undefined),
                readCommonParams: vi.fn(async () => null),
                writeCommonParams: vi.fn(async () => undefined),
                readApiDebugEnvironments: options.configRead ?? vi.fn(async () => null),
                writeApiDebugEnvironments: vi.fn(async () => undefined),
                readDbConnection: vi.fn(async () => null),
                writeDbConnection: vi.fn(async () => undefined),
                readParamSuggestRules: vi.fn(async () => null),
                writeParamSuggestRules: vi.fn(async () => undefined),
                readKcbpRuntimeConfig: vi.fn(async () => null),
                writeKcbpRuntimeConfig: vi.fn(async () => undefined),
                readRequestHistory: vi.fn(async () => null),
                writeRequestHistory: mockConfigWrite,
            },
            kcbp: {
                call: mockCallKcbp,
                cancel: mockCancelKcbp,
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

describe('KcbpCallProvider integration', () => {
    beforeEach(() => {
        useApiDebugEnvStore.getState().reset();
        mockCallKcbp.mockReset();
        mockCancelKcbp.mockReset();
        mockConfigWrite.mockReset();
        mockCancelKcbp.mockResolvedValue(true);
        stubElectronApi();
    });

    afterEach(() => {
        cleanup();
        delete (window as { electronAPI?: unknown }).electronAPI;
    });

    it('runs a KCBP call and returns to idle', async () => {
        mockCallKcbp.mockResolvedValue(successRaw);
        const user = userEvent.setup();
        renderProviders(<Harness />);

        await user.click(screen.getByRole('button', { name: 'run' }));

        await waitFor(() => expect(mockCallKcbp).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(screen.getByText('idle')).toBeTruthy());
        await waitFor(() => expect(mockConfigWrite.mock.calls.length > 0).toBe(true));
    });

    it('cancels an in-flight call and clears loading state', async () => {
        let resolveCall: (value: KcbpResponseData) => void = () => undefined;
        mockCallKcbp.mockImplementation(
            () =>
                new Promise<KcbpResponseData>((resolve) => {
                    resolveCall = resolve;
                }),
        );
        const user = userEvent.setup();
        renderProviders(<Harness />);

        await user.click(screen.getByRole('button', { name: 'run' }));
        await waitFor(() => expect(screen.getByText('loading')).toBeTruthy());

        await user.click(screen.getByRole('button', { name: 'cancel' }));

        await waitFor(() => expect(screen.getByText('idle')).toBeTruthy());
        expect(mockCancelKcbp).toHaveBeenCalledTimes(1);
        resolveCall(successRaw);
    });

    it('runs with pending address and params from draft readers', async () => {
        const unregisterDraftReader = registerTabDraftReader(() => ({
            address: '127.0.0.1:21000/999999',
            params: [{ name: 'market', value: '2', type: 'string' }],
        }));
        mockCallKcbp.mockResolvedValue(successRaw);
        const user = userEvent.setup();
        renderProviders(<Harness />);

        try {
            await user.click(screen.getByRole('button', { name: 'run' }));

            await waitFor(() => expect(mockCallKcbp).toHaveBeenCalledTimes(1));
            const payload = mockCallKcbp.mock.calls[0][0] as {
                connection: { ip?: string; port?: string };
                param: { msgtype?: string; fields?: Record<string, string> };
            };
            expect(payload.connection.ip).toBe('127.0.0.1');
            expect(payload.connection.port).toBe('21000');
            expect(payload.param.msgtype).toBe('999999');
            expect(payload.param.fields).toMatchObject({ market: '2' });
        } finally {
            unregisterDraftReader();
        }
    });

    it('runs with a pending script from the script editor draft', async () => {
        stubElectronApi({
            configRead: vi.fn(async () => ({ editorMode: 'script', kcxpEnvironments: [] })),
        });
        const unregisterDraftReader = registerTabDraftReader(() => ({
            script: `async function main(ctx) {
  await call({ g_funcid: '888888' });
  return test.pass('script draft ok');
}`,
        }));
        mockCallKcbp.mockResolvedValue(successRaw);
        const user = userEvent.setup();
        renderProviders(<Harness />);

        try {
            await waitFor(() =>
                expect(screen.getByTestId('editor-mode').textContent).toBe('script'),
            );
            await user.click(screen.getByRole('button', { name: 'run' }));

            await waitFor(() => expect(mockCallKcbp).toHaveBeenCalledTimes(1));
            expect(mockCallKcbp.mock.calls[0][0].param.msgtype).toBe('888888');
        } finally {
            unregisterDraftReader();
        }
    });
});
