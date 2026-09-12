// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiDebugProviders } from '../../providers/ApiDebugProviders';
import ParamSuggestRulesSettings from './ParamSuggestRulesSettings';

const dbCredential = 'test-only';

function renderRulesSettings() {
    return render(
        <ApiDebugProviders>
            <ParamSuggestRulesSettings />
        </ApiDebugProviders>,
    );
}

function stubElectronApi() {
    const rules = {
        rules: [
            {
                id: 'rule-bsflag',
                field: 'bsflag',
                type: 'select' as const,
                datasource: {
                    type: 'sql' as const,
                    db: 'mssql' as const,
                    sql: 'select value from t_bsflag',
                },
            },
        ],
    };
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
                readApiDebugEnvironments: vi.fn(async () => null),
                writeApiDebugEnvironments: vi.fn(async () => undefined),
                readDbConnection: vi.fn(async () => ({
                    server: 'localhost',
                    database: 'db',
                    user: 'u',
                    password: dbCredential,
                })),
                writeDbConnection: vi.fn(async () => undefined),
                readParamSuggestRules: vi.fn(async () => rules),
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

function stubMatchMedia() {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }));
}

describe('ParamSuggestRulesSettings integration', () => {
    beforeEach(() => {
        stubElectronApi();
        stubMatchMedia();
    });

    afterEach(() => {
        cleanup();
        delete (window as { electronAPI?: unknown }).electronAPI;
    });

    it('loads persisted suggest rules through the config repository', async () => {
        renderRulesSettings();

        expect(await screen.findByText('bsflag')).toBeTruthy();
        expect(screen.getByText('规则管理')).toBeTruthy();
    });
});
