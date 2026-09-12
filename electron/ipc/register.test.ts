import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ElectronAppContext } from './types';
import { registerAllIpcHandlers } from './register';
import { registerImportExportIpc } from './importExport';
import { registerKcbpIpc } from './kcbp';
import { registerStorageIpc } from './storage';
import { registerSuggestIpc } from './suggest';
import { registerWindowIpc } from './window';
import { registerAutomationIpc } from './automation';
import { registerCapabilityIpc } from './capabilities';
import { registerMcpIpc } from './mcp';

vi.mock('./storage', () => ({ registerStorageIpc: vi.fn() }));
vi.mock('./importExport', () => ({ registerImportExportIpc: vi.fn() }));
vi.mock('./kcbp', () => ({ registerKcbpIpc: vi.fn() }));
vi.mock('./suggest', () => ({ registerSuggestIpc: vi.fn() }));
vi.mock('./window', () => ({ registerWindowIpc: vi.fn() }));
vi.mock('./automation', () => ({ registerAutomationIpc: vi.fn() }));
vi.mock('./capabilities', () => ({ registerCapabilityIpc: vi.fn() }));
vi.mock('./mcp', () => ({ registerMcpIpc: vi.fn() }));

const ctx = {} as ElectronAppContext;

describe('standalone IPC registry scope', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('registers the retained API debug and automation IPC groups', () => {
        registerAllIpcHandlers(ctx);

        expect(registerStorageIpc).toHaveBeenCalledTimes(1);
        expect(registerStorageIpc).toHaveBeenCalledWith(ctx);
        expect(registerImportExportIpc).toHaveBeenCalledTimes(1);
        expect(registerKcbpIpc).toHaveBeenCalledTimes(1);
        expect(registerKcbpIpc).toHaveBeenCalledWith(ctx);
        expect(registerSuggestIpc).toHaveBeenCalledTimes(1);
        expect(registerAutomationIpc).toHaveBeenCalledWith(ctx);
        expect(registerCapabilityIpc).toHaveBeenCalledTimes(1);
        expect(registerMcpIpc).toHaveBeenCalledWith(ctx);
        expect(registerWindowIpc).toHaveBeenCalledTimes(1);
    });
});
