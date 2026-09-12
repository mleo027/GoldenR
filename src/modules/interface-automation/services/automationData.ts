import type {
    AutomationFolderRunReport,
    AutomationRunReport,
    AutomationWorkspace,
} from '@/shared/automation/types';
import { automationRuntime } from '@/runtime/automationFacade';
import { DebounceWriter } from '@/services/persistence/debounceWriter';

const writer = new DebounceWriter<AutomationWorkspace>({
    write: automationRuntime.saveWorkspace,
    delayMs: 300,
    onError: console.error,
});

export const loadAutomationData = () => automationRuntime.load();
export const saveAutomationWorkspace = (workspace: AutomationWorkspace) =>
    writer.schedule(workspace);
export const flushAutomationWorkspace = () => writer.flush();
export const saveScenarioReport = (report: AutomationRunReport) =>
    automationRuntime.saveScenarioReport(report);
export const saveFolderReport = (report: AutomationFolderRunReport) =>
    automationRuntime.saveFolderReport(report);
