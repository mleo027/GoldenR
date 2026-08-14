export type {
    AppLifecycleApi,
    ConfigStorageApi,
    DatabaseApi,
    ElectronAPI,
    ImportExportApi,
    ImportFileFormat,
    ImportFileResult,
    KcbpApi,
    ParamFileOpenResult,
    ParamFileStatResult,
    SaveFileResult,
    WindowApi,
} from '../shared/electron/api';

declare global {
    interface Window {
        electronAPI?: ElectronAPI;
    }
}

export {};
