// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const settings = vi.hoisted(() => ({
    dbConfig: {},
    rules: [],
    fieldGroups: [],
    selectedFieldKey: null,
    fieldSearch: '',
    testField: '',
    testContext: '',
    testKeyword: '',
    testRunning: false,
    testResponse: null,
    testResolvedRule: undefined,
    activeGroup: null,
    ruleForm: {},
    ruleModalOpen: false,
    editingRuleId: null,
    createMode: 'field',
    editingRule: undefined,
    presetField: undefined,
    sqlDrawer: null,
    importModalOpen: false,
    importText: '',
    setImportModalOpen: vi.fn(),
    setImportText: vi.fn(),
    handleImportRules: vi.fn(),
    handleExportRules: vi.fn(),
    openCreateRule: vi.fn(),
    openEditRule: vi.fn(),
    handleSaveRule: vi.fn(),
    handleToggleEnabled: vi.fn(),
    handleDeleteRule: vi.fn(),
    setFieldSearch: vi.fn(),
    handleSelectField: vi.fn(),
    setTestField: vi.fn(),
    setTestContext: vi.fn(),
    setTestKeyword: vi.fn(),
    handleRunTest: vi.fn(),
    setSqlDrawer: vi.fn(),
}));

vi.mock('../../hooks/useParamSuggestRulesSettings', () => ({
    useParamSuggestRulesSettings: () => settings,
}));
vi.mock('../../../../components/layout/SettingsConfigPath', () => ({
    default: () => <div />,
}));
vi.mock('./ParamSuggestFieldSidebar', () => ({ default: () => <div /> }));
vi.mock('./ParamSuggestRuleTable', () => ({ default: () => <div /> }));
vi.mock('./ParamSuggestRuleTestPanel', () => ({ default: () => <div /> }));
vi.mock('./ParamSuggestSqlDrawer', () => ({ default: () => <div /> }));
vi.mock('./ParamSuggestRuleFormModal', () => ({ default: () => <div /> }));

import ParamSuggestRulesSettings from './ParamSuggestRulesSettings';

describe('ParamSuggestRulesSettings transfer actions', () => {
    afterEach(() => {
        cleanup();
        for (const value of Object.values(settings)) {
            if (typeof value === 'function' && 'mockClear' in value) value.mockClear();
        }
        settings.importModalOpen = false;
        settings.importText = '';
    });

    it('opens the import flow through the settings hook', async () => {
        const user = userEvent.setup();
        render(<ParamSuggestRulesSettings />);

        await user.click(screen.getByRole('button', { name: /导入/ }));
        expect(settings.setImportModalOpen).toHaveBeenCalledWith(true);
    });

    it('forwards the export toolbar action', async () => {
        const user = userEvent.setup();
        render(<ParamSuggestRulesSettings />);

        await user.click(screen.getByRole('button', { name: /导出/ }));
        expect(settings.handleExportRules).toHaveBeenCalledOnce();
    });
});
