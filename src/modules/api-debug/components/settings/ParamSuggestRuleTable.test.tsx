// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ParamFieldRule } from '../../types/paramSuggest';
import ParamSuggestRuleTable from './ParamSuggestRuleTable';

const rule: ParamFieldRule = {
    id: 'rule-bsflag',
    field: 'bsflag',
    type: 'select',
    datasource: {
        type: 'sql',
        db: 'mssql',
        sql: 'select value from t_bsflag',
    },
};

function renderRuleTable(
    expandedRuleId: string | null,
    callbacks = {
        onToggleExpanded: vi.fn(),
        onToggleEnabled: vi.fn(),
        onDeleteRule: vi.fn(),
    },
) {
    render(
        <ParamSuggestRuleTable
            fieldLabel="bsflag"
            rules={[rule]}
            expandedRuleId={expandedRuleId}
            onToggleExpanded={callbacks.onToggleExpanded}
            onToggleEnabled={callbacks.onToggleEnabled}
            onDeleteRule={callbacks.onDeleteRule}
            renderExpanded={() => <div>规则配置与测试</div>}
        />,
    );
    return callbacks;
}

describe('ParamSuggestRuleTable', () => {
    afterEach(cleanup);

    it('keeps rules collapsed until the horizontal rule card is clicked', async () => {
        const user = userEvent.setup();
        const callbacks = renderRuleTable(null);

        expect(screen.queryByText('规则配置与测试')).toBeNull();
        await user.click(screen.getByText('select value from t_bsflag'));

        expect(callbacks.onToggleExpanded).toHaveBeenCalledWith(rule);
    });

    it('renders configuration and test content only for the expanded rule', () => {
        renderRuleTable(rule.id);

        expect(screen.getByText('规则配置与测试')).toBeTruthy();
    });

    it('toggles enabled state without expanding the rule', async () => {
        const user = userEvent.setup();
        const callbacks = renderRuleTable(null);

        await user.click(screen.getByRole('switch', { name: '启用规则 1' }));

        expect(callbacks.onToggleEnabled).toHaveBeenCalledWith(rule, false);
        expect(callbacks.onToggleExpanded).not.toHaveBeenCalled();
    });
});
