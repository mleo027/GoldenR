// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { KcbpResponseData } from '../../../types/kcbp';
import { useKcbpCall } from '../hooks/useKcbpCall';
import { ApiDebugProviders } from './ApiDebugProviders';
import { AppEnvProvider } from '../../../store/appEnvStore';
import { UndoRedoProvider } from '../../../platform/undo';

const successRaw: KcbpResponseData = {
    code: '0',
    msg: 'ok',
    data: [{ custid: '1' }],
    stats: { timecost: 12, rows: 1 },
};

const mockCallKcbp = vi.fn();
const mockCancelKcbp = vi.fn();

function Harness() {
    const { loading, run, cancel } = useKcbpCall();
    return (
        <div>
            <button onClick={() => void run()}>run</button>
            <button onClick={cancel}>cancel</button>
            <span>{loading ? 'loading' : 'idle'}</span>
        </div>
    );
}

function renderProviders(children: ReactNode) {
    return render(
        <AppEnvProvider>
            <UndoRedoProvider>
                <ApiDebugProviders>{children}</ApiDebugProviders>
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
        mockCallKcbp.mockReset();
        mockCancelKcbp.mockReset();
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
});
