// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTabsActions, useTabsState } from '../store/useTabs';
import { flushWorkspaceDrafts } from '../store/workspaceFlushRegistry';
import { registerTabDraftReader } from '../utils/workspace/tabDraftRegistry';
import { ApiDebugProviders } from './ApiDebugProviders';

const mockWrite = vi.fn<(data: unknown) => Promise<void>>(async () => undefined);

function Harness() {
    const { state } = useTabsState();
    const { addProject, addCase, renameCase } = useTabsActions();
    const activeTab = state.projects[state.activeProjectIndex]?.cases[state.activeCaseIndex];
    const activeProjectIndex = state.activeProjectIndex;
    const activeCaseIndex = state.activeCaseIndex;
    const lastCaseIndex = (state.projects[activeProjectIndex]?.cases.length ?? 1) - 1;

    return (
        <div>
            <button type="button" onClick={() => addProject()}>
                add-project
            </button>
            <button type="button" onClick={() => addCase(activeProjectIndex)}>
                add-case
            </button>
            <button
                type="button"
                onClick={() => renameCase(activeProjectIndex, lastCaseIndex, 'renamed')}
            >
                rename-case
            </button>
            <span data-testid="project-count">{state.projects.length}</span>
            <span data-testid="case-count">
                {state.projects[activeProjectIndex]?.cases.length ?? 0}
            </span>
            <span data-testid="active-name">
                {state.projects[activeProjectIndex]?.cases[activeCaseIndex]?.name}
            </span>
            <span data-testid="tabs-loaded">{String(state.loaded)}</span>
            <span data-testid="active-address">{activeTab?.address}</span>
        </div>
    );
}

function renderHarness() {
    return render(
        <ApiDebugProviders>
            <Harness />
        </ApiDebugProviders>,
    );
}

function stubElectronApi() {
    Object.defineProperty(window, 'electronAPI', {
        configurable: true,
        value: {
            config: {
                readAppEnv: vi.fn(async () => null),
                writeAppEnv: vi.fn(async () => undefined),
                readProjects: vi.fn(async () => null),
                writeProjects: mockWrite,
                readWorkspace: vi.fn(async () => null),
                writeWorkspace: vi.fn(async () => undefined),
                readCommonParams: vi.fn(async () => null),
                writeCommonParams: vi.fn(async () => undefined),
                readApiDebugEnvironments: vi.fn(async () => null),
                writeApiDebugEnvironments: vi.fn(async () => undefined),
                readDbConnection: vi.fn(async () => null),
                writeDbConnection: vi.fn(async () => undefined),
                readParamSuggestRules: vi.fn(async () => null),
                writeParamSuggestRules: vi.fn(async () => undefined),
                readKcbpRuntimeConfig: vi.fn(async () => null),
                writeKcbpRuntimeConfig: vi.fn(async () => undefined),
                readRequestHistory: vi.fn(async () => null),
                writeRequestHistory: vi.fn(async () => undefined),
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
        await waitFor(() => expect(mockWrite).toHaveBeenCalledWith(expect.anything()));
    });

    it('persists pending draft fields directly during workspace flush', async () => {
        const unregisterDraftReader = registerTabDraftReader(() => ({
            address: '127.0.0.1:21000/777777',
            params: [{ name: 'market', value: '2', type: 'string' }],
            script: 'async function main() { return test.pass(); }',
        }));
        renderHarness();

        try {
            await waitFor(() => expect(screen.getByTestId('tabs-loaded').textContent).toBe('true'));
            await flushWorkspaceDrafts();

            await waitFor(() => expect(mockWrite).toHaveBeenCalledWith(expect.anything()));
            const lastProjectWrite = mockWrite.mock.calls.at(-1)?.[0] as {
                projects: Array<{ cases: Array<Record<string, unknown>> }>;
            };
            expect(lastProjectWrite.projects[0].cases[0]).toMatchObject({
                address: '127.0.0.1:21000/777777',
                params: [{ name: 'market', value: '2', type: 'string' }],
                script: 'async function main() { return test.pass(); }',
            });
        } finally {
            unregisterDraftReader();
        }
    });
});
