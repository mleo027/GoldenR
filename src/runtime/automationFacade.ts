import { requireElectronAPI } from '@/platform/bridge/electron';

export const automationRuntime = {
    load: () => requireElectronAPI().automation.load(),
    saveWorkspace: (
        workspace: Parameters<
            ReturnType<typeof requireElectronAPI>['automation']['saveWorkspace']
        >[0],
    ) => requireElectronAPI().automation.saveWorkspace(workspace),
    saveScenarioReport: (
        report: Parameters<
            ReturnType<typeof requireElectronAPI>['automation']['saveScenarioReport']
        >[0],
    ) => requireElectronAPI().automation.saveScenarioReport(report),
    saveFolderReport: (
        report: Parameters<
            ReturnType<typeof requireElectronAPI>['automation']['saveFolderReport']
        >[0],
    ) => requireElectronAPI().automation.saveFolderReport(report),
    executeSql: (
        request: Parameters<ReturnType<typeof requireElectronAPI>['automation']['executeSql']>[0],
    ) => requireElectronAPI().automation.executeSql(request),
    cancelSql: (requestId: string) => requireElectronAPI().automation.cancelSql(requestId),
};
