// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';

const exportCsv = vi.hoisted(() => vi.fn());
const exportText = vi.hoisted(() => vi.fn());

vi.mock('../../utils/exportTable', () => ({
    exportTableToCsv: exportCsv,
    exportTableToText: exportText,
}));

import ResponseTableTools from './ResponseTableTools';

function renderTools(overrides: Partial<ComponentProps<typeof ResponseTableTools>> = {}) {
    return render(
        <ResponseTableTools
            searchKeyword=""
            onSearchKeywordChange={vi.fn()}
            onFullscreen={vi.fn()}
            exportData={[{ id: '1', name: 'Alice' }]}
            exportFilename="response.csv"
            {...overrides}
        />,
    );
}

describe('ResponseTableTools page actions', () => {
    afterEach(() => {
        cleanup();
        exportCsv.mockReset();
        exportText.mockReset();
    });

    it('exports CSV after choosing a format and confirming', async () => {
        const user = userEvent.setup();
        exportCsv.mockResolvedValue({ saved: true, filePath: 'C:/response.csv' });
        renderTools();

        await user.click(screen.getByRole('button', { name: '导出' }));
        await user.click(
            within(screen.getByRole('dialog')).getByRole('button', { name: /导\s*出/ }),
        );

        await waitFor(() =>
            expect(exportCsv).toHaveBeenCalledWith([{ id: '1', name: 'Alice' }], 'response.csv'),
        );
        expect(exportText).not.toHaveBeenCalled();
    });

    it('exports TXT with a converted filename and supports cancelling', async () => {
        const user = userEvent.setup();
        exportText.mockResolvedValue({ saved: true, filePath: 'C:/response.txt' });
        renderTools();

        await user.click(screen.getByRole('button', { name: '导出' }));
        await user.click(screen.getByLabelText(/纯文本/));
        await user.click(
            within(screen.getByRole('dialog')).getByRole('button', { name: /导\s*出/ }),
        );
        await waitFor(() =>
            expect(exportText).toHaveBeenCalledWith([{ id: '1', name: 'Alice' }], 'response.txt'),
        );

        await user.click(screen.getByRole('button', { name: '导出' }));
        await user.click(screen.getByRole('button', { name: /取\s*消/ }));
        expect(exportText).toHaveBeenCalledTimes(1);
    });

    it('filters columns and toggles individual and all-column selection', async () => {
        const user = userEvent.setup();
        const onVisibleChange = vi.fn();
        renderTools({
            columnKeys: ['id', 'name', 'remark'],
            visibleColumnKeys: ['id', 'name', 'remark'],
            onVisibleColumnKeysChange: onVisibleChange,
        });

        await user.click(screen.getByRole('button', { name: '选择显示列' }));
        const columnSearch = screen.getByPlaceholderText('搜索列名');
        await user.type(columnSearch, 'name');
        expect(screen.getByText('name')).toBeTruthy();
        expect(screen.queryByText('remark')).toBeNull();

        await user.click(screen.getByRole('checkbox', { name: 'name' }));
        expect(onVisibleChange).toHaveBeenCalledWith(['id', 'remark']);
        await user.click(screen.getByRole('button', { name: '取消全选' }));
        expect(onVisibleChange).toHaveBeenLastCalledWith([]);
    });

    it('does not call export handlers when disabled', async () => {
        renderTools({ disabled: true });
        fireEvent.click(screen.getByRole('button', { name: '导出' }));
        expect(exportCsv).not.toHaveBeenCalled();
    });
});
