import { useRef, useState } from 'react';
import { App } from 'antd';
import type {
    AutomationFolder,
    AutomationFolderRunReport,
    AutomationInputValue,
    AutomationRunReport,
    AutomationScenario,
    AutomationScenarioMetadata,
} from '@/shared/automation/types';
import type { KcxpEnvironment } from '@/shared/kcxp/types';
import { AutomationRunController, inspectAutomationScript } from '../services/automationRunner';
import { saveFolderReport, saveScenarioReport } from '../services/automationData';
import { resolveScenarioInputs, validateScenarioInputs } from '../utils/scenarioInputs';
import { useAutomationStore } from '../store/automationStore';

const sensitiveNames = (metadata: AutomationScenarioMetadata) =>
    Object.entries(metadata.inputs ?? {})
        .filter(([, item]) => item.sensitive)
        .map(([name]) => name);

async function runScenario(
    scenario: AutomationScenario,
    environment: KcxpEnvironment,
    metadata: AutomationScenarioMetadata,
    inputs: Record<string, AutomationInputValue>,
    controller: AutomationRunController,
) {
    return controller.run({
        scenario,
        environment,
        inputs: validateScenarioInputs(metadata, inputs),
        sensitiveInputNames: sensitiveNames(metadata),
    });
}

function failedReport(
    scenario: AutomationScenario,
    environmentId: string,
    error: unknown,
): AutomationRunReport {
    return {
        id: `run-${crypto.randomUUID()}`,
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        environmentId,
        status: 'failed',
        startedAt: Date.now(),
        durationMs: 0,
        inputs: {},
        steps: [],
        error: error instanceof Error ? error.message : String(error),
    };
}

function summarize(
    folder: AutomationFolder,
    scenarios: AutomationScenario[],
    reports: AutomationRunReport[],
    startedAt: number,
    cancelled: boolean,
): AutomationFolderRunReport {
    const statuses = new Set(reports.map((item) => item.status));
    return {
        id: `folder-run-${crypto.randomUUID()}`,
        folderId: folder.id,
        startedAt,
        durationMs: Date.now() - startedAt,
        status:
            cancelled || statuses.has('cancelled')
                ? 'cancelled'
                : statuses.has('failed')
                  ? 'failed'
                  : 'passed',
        passedCount: reports.filter((item) => item.status === 'passed').length,
        failedCount: reports.filter((item) => item.status === 'failed').length,
        skippedCount: scenarios.length - reports.length,
        scenarioReports: reports,
    };
}

export function useAutomationRun() {
    const { message } = App.useApp();
    const store = useAutomationStore();
    const [running, setRunning] = useState(false);
    const controller = useRef<AutomationRunController>();
    const cancelRequested = useRef(false);
    const saveReport = async (report: AutomationRunReport) => {
        store.setScenarioReport(report);
        await saveScenarioReport(report);
    };
    const runOne = async (
        scenario?: AutomationScenario,
        environment?: KcxpEnvironment,
        metadata?: AutomationScenarioMetadata,
        inputs: Record<string, AutomationInputValue> = {},
    ) => {
        if (!scenario || !environment || !metadata)
            return void message.warning('请选择场景和运行环境，并确保脚本有效');
        setRunning(true);
        cancelRequested.current = false;
        try {
            controller.current = new AutomationRunController();
            await saveReport(
                await runScenario(scenario, environment, metadata, inputs, controller.current),
            );
        } catch (error) {
            void message.error(error instanceof Error ? error.message : String(error));
        } finally {
            controller.current = undefined;
            setRunning(false);
        }
    };
    const runFolder = async (
        folder: AutomationFolder,
        scenarios: AutomationScenario[],
        environment: KcxpEnvironment,
        selectedId: string | undefined,
        selectedInputs: Record<string, AutomationInputValue>,
    ) => {
        const startedAt = Date.now();
        const reports: AutomationRunReport[] = [];
        setRunning(true);
        cancelRequested.current = false;
        try {
            for (const item of scenarios) {
                if (cancelRequested.current) break;
                if (!item.enabled) continue;
                let report: AutomationRunReport;
                try {
                    const metadata = await inspectAutomationScript(item.script);
                    controller.current = new AutomationRunController();
                    report = await runScenario(
                        item,
                        environment,
                        metadata,
                        item.id === selectedId
                            ? selectedInputs
                            : resolveScenarioInputs(item.id, metadata),
                        controller.current,
                    );
                } catch (error) {
                    report = failedReport(item, environment.id, error);
                }
                reports.push(report);
                await saveReport(report);
                if (report.status === 'cancelled') break;
            }
            const summary = summarize(
                folder,
                scenarios,
                reports,
                startedAt,
                cancelRequested.current,
            );
            store.setFolderReport(summary);
            await saveFolderReport(summary);
        } finally {
            controller.current = undefined;
            setRunning(false);
        }
    };
    const cancel = () => {
        cancelRequested.current = true;
        return controller.current?.cancel();
    };
    return { running, runOne, runFolder, cancel };
}
