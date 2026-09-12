import { getElectronAPI } from '@/lib/electron';
import type {
    ImportFileFormat,
    ImportFileResult,
    ParamFileOpenResult,
    ParamFileStatResult,
    SaveFileResult,
} from '@/shared/electron/api';

export interface ImportExportRuntime {
    isAvailable(): boolean;
    saveJson(content: string, filename: string): Promise<SaveFileResult>;
    saveCsv(content: string, filename: string): Promise<SaveFileResult>;
    saveTxt(content: string, filename: string): Promise<SaveFileResult>;
    saveHtml(content: string, filename: string): Promise<SaveFileResult>;
    saveIni(content: string, filename: string): Promise<SaveFileResult>;
    openImportFile(format: ImportFileFormat): Promise<ImportFileResult>;
    openParamFile(): Promise<ParamFileOpenResult>;
    statParamFile(filePath: string): Promise<ParamFileStatResult>;
}

function requireImportExportApi() {
    const api = getElectronAPI()?.importExport;
    if (!api) throw new Error('Import/export runtime is unavailable');
    return api;
}

export const importExportRuntime: ImportExportRuntime = {
    isAvailable: () => Boolean(getElectronAPI()?.importExport),
    saveJson: async (content, filename) => requireImportExportApi().saveJson(content, filename),
    saveCsv: async (content, filename) => requireImportExportApi().saveCsv(content, filename),
    saveTxt: async (content, filename) => requireImportExportApi().saveTxt(content, filename),
    saveHtml: async (content, filename) => requireImportExportApi().saveHtml(content, filename),
    saveIni: async (content, filename) => requireImportExportApi().saveIni(content, filename),
    openImportFile: async (format) => requireImportExportApi().openImportFile(format),
    openParamFile: async () => requireImportExportApi().openParamFile(),
    statParamFile: async (filePath) => requireImportExportApi().statParamFile(filePath),
};
