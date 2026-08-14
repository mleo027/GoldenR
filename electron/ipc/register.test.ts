import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ElectronAppContext } from './types';
import { registerAllIpcHandlers } from './register';
import { registerImportExportIpc } from './importExport';
import { registerKcbpIpc } from './kcbp';
import { registerStorageIpc } from './storage';
import { registerSuggestIpc } from './suggest';
import { registerWindowIpc } from './window';

vi.mock('./storage', () => ({ registerStorageIpc: vi.fn() }));
vi.mock('./importExport', () => ({ registerImportExportIpc: vi.fn() }));
vi.mock('./kcbp', () => ({ registerKcbpIpc: vi.fn() }));
vi.mock('./suggest', () => ({ registerSuggestIpc: vi.fn() }));
vi.mock('./window', () => ({ registerWindowIpc: vi.fn() }));

const ctx = {} as ElectronAppContext;

describe('standalone IPC registry scope', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('registers only the retained api-debug IPC groups', () => {
        registerAllIpcHandlers(ctx);

        expect(registerStorageIpc).toHaveBeenCalledTimes(1);
        expect(registerStorageIpc).toHaveBeenCalledWith(ctx);
        expect(registerImportExportIpc).toHaveBeenCalledTimes(1);
        expect(registerKcbpIpc).toHaveBeenCalledTimes(1);
        expect(registerKcbpIpc).toHaveBeenCalledWith(ctx);
        expect(registerSuggestIpc).toHaveBeenCalledTimes(1);
        expect(registerWindowIpc).toHaveBeenCalledTimes(1);
    });
});
