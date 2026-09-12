/**
 * 场景运行的应用级路径（不依赖 React）。
 *
 * 面板的历史运行逻辑与能力层（外部调用）共用这一条路径：都是 Worker + 既有 SQL/API
 * 策略，因此生产环境禁写、`validateAutomationWriteSql`、报告行数限制对两条入口
 * 一视同仁——这也是"能力层"存在的意义：外部调用不能绕开安全约束。
 */
import type { AutomationRunReport } from '@/shared/automation/types';
import { saveScenarioReport } from './automationData';
import { loadAutomationEnvironments } from './automationEnvironmentData';
import { AutomationRunController, inspectAutomationScript } from './automationRunner';
import { useAutomationStore } from '../store/automationStore';
import {
    resolveScenarioInputs,
    sensitiveInputNames,
    validateScenarioInputs,
} from '../utils/scenarioInputs';

/**
 * 运行场景并落库报告。
 *
 * `environmentId` 省略时使用第一个可用环境——外部调用方没有"当前选中环境"这个概念，
 * 显式传参比复用界面选择更可靠。
 */
export async function runScenarioForCapability(
    scenarioId: string,
    environmentId?: string,
): Promise<AutomationRunReport> {
    const scenario = useAutomationStore
        .getState()
        .workspace.scenarios.find((item) => item.id === scenarioId);
    if (!scenario) throw new Error(`场景不存在：${scenarioId}`);

    const environments = await loadAutomationEnvironments();
    const environment = environments.find((item) => item.id === environmentId) ?? environments[0];
    if (!environment) throw new Error('没有可用的运行环境');

    const metadata = await inspectAutomationScript(scenario.script);
    const inputs = resolveScenarioInputs(scenario.id, metadata);
    const controller = new AutomationRunController();
    const report = await controller.run({
        scenario,
        environment,
        inputs: validateScenarioInputs(metadata, inputs),
        sensitiveInputNames: sensitiveInputNames(metadata),
    });
    useAutomationStore.getState().setScenarioReport(report);
    await saveScenarioReport(report);
    return report;
}
