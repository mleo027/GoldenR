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
    saveCsv(content: string, filename: string): Promise<SaveFileResult>;
    saveTxt(content: string, filename: string): Promise<SaveFileResult>;
    saveHtml(content: string, filename: string): Promise<SaveFileResult>;
    saveIni(content: string, filename: string): Promise<SaveFileResult>;
    openImportFile(format: ImportFileFormat): Promise<ImportFileResult>;
    openParamFile(): Promise<ParamFileOpenResult>;
    statParamFile(filePath: string): Promise<ParamFileStatResult>;
}

export const importExportRuntime: ImportExportRuntime = {
    isAvailable: () => Boolean(getElectronAPI()?.importExport),
    saveCsv: (content, filename) => getElectronAPI()!.importExport.saveCsv(content, filename),
    saveTxt: (content, filename) => getElectronAPI()!.importExport.saveTxt(content, filename),
    saveHtml: (content, filename) => getElectronAPI()!.importExport.saveHtml(content, filename),
    saveIni: (content, filename) => getElectronAPI()!.importExport.saveIni(content, filename),
    openImportFile: (format) => getElectronAPI()!.importExport.openImportFile(format),
    openParamFile: () => getElectronAPI()!.importExport.openParamFile(),
    statParamFile: (filePath) => getElectronAPI()!.importExport.statParamFile(filePath),
};
