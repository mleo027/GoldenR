// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { createProject } from '../../../test/factories';

const modal = vi.hoisted(() => ({
    confirm: vi.fn(() => ({ destroy: vi.fn() })),
}));
const message = vi.hoisted(() => ({ error: vi.fn(), warning: vi.fn(), success: vi.fn() }));
const importRuntime = vi.hoisted(() => ({
    isAvailable: vi.fn(() => true),
    openImportFile: vi.fn(),
}));

vi.mock('antd', () => ({
    App: { useApp: () => ({ modal }) },
    Button: ({ children, onClick }: { children: ReactNode; onClick: () => void }) => (
        <button type="button" onClick={onClick}>
            {children}
        </button>
    ),
    message,
}));
vi.mock('../../../runtime/importExportFacade', () => ({ importExportRuntime: importRuntime }));

import { useProjectImport } from './useProjectImport';

const project = createProject({
    cases: [
        {
            ...createProject().cases[0],
            address: '127.0.0.1:21000/150501',
        },
    ],
});

function renderPicker(importCases = vi.fn()) {
    const result = renderHook(() => useProjectImport({ projects: [project], importCases }));
    result.result.current.openImportFormatPicker(0);
    const calls = modal.confirm.mock.calls as unknown as Array<[{ content: ReactNode }]>;
    const config = calls.at(-1)![0];
    render(config.content);
    return { ...result, importCases };
}

describe('useProjectImport page flow', () => {
    afterEach(cleanup);

    beforeEach(() => {
        modal.confirm.mockClear();
        message.error.mockClear();
        message.warning.mockClear();
        message.success.mockClear();
        importRuntime.isAvailable.mockReset().mockReturnValue(true);
        importRuntime.openImportFile.mockReset();
    });

    it('opens the picker and imports JSON after choosing JSON', async () => {
        const user = userEvent.setup();
        importRuntime.openImportFile.mockResolvedValue({
            opened: true,
            format: 'json',
            data: [{ msgtype_src: 'KCAS.150502', remark: 'Imported' }],
        });
        const { importCases } = renderPicker();

        await user.click(screen.getAllByRole('button', { name: 'JSON 文件' }).at(-1)!);

        expect(importRuntime.openImportFile).toHaveBeenCalledWith('json');
        expect(importCases).toHaveBeenCalledWith(0, [
            expect.objectContaining({
                name: 'Imported',
                address: '127.0.0.1:21000/150502?queue=req1&timeout=15',
            }),
        ]);
        expect(message.success).toHaveBeenCalled();
    });

    it('imports INI, handles cancellation and reports unavailable runtime', async () => {
        const user = userEvent.setup();
        importRuntime.openImportFile.mockResolvedValueOnce({ opened: false });
        const first = renderPicker();
        await user.click(screen.getAllByRole('button', { name: /INI 文件/ }).at(-1)!);
        expect(first.importCases).not.toHaveBeenCalled();

        importRuntime.isAvailable.mockReturnValue(false);
        const unavailable = renderHook(() =>
            useProjectImport({ projects: [project], importCases: vi.fn() }),
        );
        unavailable.result.current.openImportFormatPicker(0);
        const calls = modal.confirm.mock.calls as unknown as Array<[{ content: ReactNode }]>;
        const config = calls.at(-1)![0];
        render(config.content);
        await user.click(screen.getAllByRole('button', { name: 'JSON 文件' }).at(-1)!);
        expect(message.error).toHaveBeenCalled();
    });

    it('reports an import error without changing cases', async () => {
        const user = userEvent.setup();
        importRuntime.openImportFile.mockRejectedValue(new Error('read failed'));
        const { importCases } = renderPicker();

        await user.click(screen.getAllByRole('button', { name: 'JSON 文件' }).at(-1)!);

        expect(importCases).not.toHaveBeenCalled();
        expect(message.error).toHaveBeenCalledWith(expect.stringContaining('read failed'));
    });
});
