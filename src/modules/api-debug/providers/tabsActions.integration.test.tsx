// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppEnvProvider } from '../../../store/appEnvStore';
import { UndoRedoProvider } from '../../../platform/undo';
import { useTabsActions, useTabsState } from '../store/useTabs';
import { ApiDebugProviders } from './ApiDebugProviders';

const mockWrite = vi.fn(async () => undefined);

function Harness() {
    const { state } = useTabsState();
    const { addProject, addCase, renameCase } = useTabsActions();
    const activeProjectIndex = state.activeProjectIndex;
    const activeCaseIndex = state.activeCaseIndex;
    const lastCaseIndex = (state.projects[activeProjectIndex]?.cases.length ?? 1) - 1;

    return (
        <div>
            <button onClick={() => addProject()}>add-project</button>
            <button onClick={() => addCase(activeProjectIndex)}>add-case</button>
            <button onClick={() => renameCase(activeProjectIndex, lastCaseIndex, 'renamed')}>
                rename-case
            </button>
            <span data-testid="project-count">{state.projects.length}</span>
            <span data-testid="case-count">
                {state.projects[activeProjectIndex]?.cases.length ?? 0}
            </span>
            <span data-testid="active-name">
                {state.projects[activeProjectIndex]?.cases[activeCaseIndex]?.name}
            </span>
        </div>
    );
}

function renderHarness() {
    return render(
        <AppEnvProvider>
            <UndoRedoProvider>
                <ApiDebugProviders>
                    <Harness />
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
                write: mockWrite,
                flush: vi.fn(async () => undefined),
            },
            kcbp: {
                call: vi.fn(),
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

describe('TabsActions integration', () => {
    beforeEach(() => {
        mockWrite.mockClear();
        stubElectronApi();
    });

    afterEach(() => {
        cleanup();
        delete (window as { electronAPI?: unknown }).electronAPI;
    });

    it('adds projects and cases, renames the active case, and persists automatically', async () => {
        const user = userEvent.setup();
        renderHarness();

        expect(screen.getByTestId('project-count').textContent).toBe('1');

        await user.click(screen.getByRole('button', { name: 'add-project' }));
        await user.click(screen.getByRole('button', { name: 'add-case' }));
        await user.click(screen.getByRole('button', { name: 'rename-case' }));

        expect(screen.getByTestId('project-count').textContent).toBe('2');
        expect(screen.getByTestId('case-count').textContent).toBe('2');
        await waitFor(() => expect(screen.getByTestId('active-name').textContent).toBe('renamed'));
        await waitFor(() =>
            expect(mockWrite).toHaveBeenCalledWith('project.json', expect.anything()),
        );
    });
});
