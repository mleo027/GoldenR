import { registerKcbpIpc } from './kcbp';
import { registerStorageIpc } from './storage';
import { registerSuggestIpc } from './suggest';
import type { ElectronAppContext } from './types';
import { registerWindowIpc } from './window';
import { registerImportExportIpc } from './importExport';

export function registerAllIpcHandlers(ctx: ElectronAppContext): void {
    registerStorageIpc(ctx);
    registerImportExportIpc();
    registerKcbpIpc(ctx);
    registerSuggestIpc();
    registerWindowIpc();
}
