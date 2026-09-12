import type { KcxpEnvironment } from '@/shared/kcxp/types';
import type {
    AutomationActionReport,
    AutomationInputValues,
    AutomationProgressEvent,
    AutomationRunReport,
    AutomationScenario,
    AutomationScenarioMetadata,
    AutomationStepReport,
} from '@/shared/automation/types';
import { buildAutomationApiRequest } from '@/shared/automation/buildApiRequest';
import { redactAutomationValue } from '@/shared/automation/redaction';
import { limitAutomationReportValue } from '@/shared/automation/reportLimit';
import { apiCallRuntime } from '@/runtime/apiCallFacade';
import { automationRuntime } from '@/runtime/automationFacade';
import { suggestRuntime } from '@/runtime/suggestFacade';
import type {
    WorkerInboundMessage,
    WorkerOperation,
    WorkerOutboundMessage,
} from '../worker/protocol';

const RUN_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_ACTIONS = 200;
const MAX_API_ACTIONS = 50;
const MAX_SQL_ACTIONS = 100;

const createId = (prefix: string) => `${prefix}-${Date.now()}-${crypto.randomUUID()}`;
const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

function createWorker(): Worker {
    return new Worker(new URL('../worker/automation.worker.ts', import.meta.url), {
        type: 'module',
    });
}

export function inspectAutomationScript(script: string): Promise<AutomationScenarioMetadata> {
    const worker = createWorker();
    const requestId = createId('inspect');
    return new Promise((resolve, reject) => {
        const timer = window.setTimeout(() => {
            worker.terminate();
            reject(new Error('脚本元数据解析超时'));
        }, 2000);
        worker.onmessage = (event: MessageEvent<WorkerOutboundMessage>) => {
            const message = event.data;
            if (message.type !== 'inspected' || message.id !== requestId) return;
            window.clearTimeout(timer);
            worker.terminate();
            if (message.error || !message.metadata)
                reject(new Error(message.error ?? '脚本元数据为空'));
            else resolve(message.metadata);
        };
        worker.onerror = (event) => {
            window.clearTimeout(timer);
            worker.terminate();
            reject(new Error(event.message));
        };
        worker.postMessage({
            type: 'inspect',
            id: requestId,
            script,
        } satisfies WorkerInboundMessage);
    });
}

interface RunOptions {
    scenario: AutomationScenario;
    environment: KcxpEnvironment;
    inputs: AutomationInputValues;
    sensitiveInputNames?: string[];
    onProgress?: (event: AutomationProgressEvent) => void;
}

interface ReportBuilder {
    report: AutomationRunReport;
    consume(event: AutomationProgressEvent): void;
    finish(status: AutomationRunReport['status'], error?: string): AutomationRunReport;
}

function createReport(options: RunOptions): ReportBuilder {
    const startedAt = Date.now();
    const root: AutomationStepReport = {
        id: 'root',
        name: options.scenario.name,
        depth: 0,
        status: 'running' as const,
        startedAt,
        durationMs: 0,
        actions: [],
    };
    const report: AutomationRunReport = {
        id: createId('run'),
        scenarioId: options.scenario.id,
        scenarioName: options.scenario.name,
        environmentId: options.environment.id,
        status: 'running',
        startedAt,
        durationMs: 0,
        inputs: redactAutomationValue(
            options.inputs,
            (options.sensitiveInputNames ?? []).map((name) => options.inputs[name]),
        ) as AutomationInputValues,
        steps: [root],
    };
    const consume = (event: AutomationProgressEvent) => {
        options.onProgress?.(event);
        if (event.type === 'step-started') {
            report.steps.push({
                id: event.stepId,
                parentId: event.parentId,
                name: event.name,
                depth: event.depth + 1,
                status: 'running',
                startedAt: Date.now(),
                durationMs: 0,
                actions: [],
            });
            return;
        }
        if (event.type === 'step-finished') {
            const step = report.steps.find((item) => item.id === event.stepId);
            if (step) {
                step.status = event.status;
                step.error = event.error;
                step.durationMs = Date.now() - step.startedAt;
            }
            return;
        }
        if (event.type === 'action-finished') {
            event.action.request = redactAutomationValue(
                event.action.request,
                (options.sensitiveInputNames ?? []).map((name) => options.inputs[name]),
            );
            event.action.result = redactAutomationValue(
                event.action.result,
                (options.sensitiveInputNames ?? []).map((name) => options.inputs[name]),
            );
            const limited = limitAutomationReportValue(event.action.result);
            event.action.result = limited.value;
            event.action.truncated = event.action.truncated || limited.truncated;
            const step = report.steps.find((item) => item.id === event.action.stepId) ?? root;
            const existing = step.actions.findIndex((item) => item.id === event.action.id);
            if (existing >= 0) step.actions[existing] = event.action;
            else step.actions.push(event.action);
        }
    };
    return {
        report,
        consume,
        finish(status, error) {
            report.status = status;
            report.error = error;
            report.durationMs = Date.now() - startedAt;
            root.status = status;
            root.durationMs = report.durationMs;
            return report;
        },
    };
}

function actionFor(operation: WorkerOperation, stepId?: string): AutomationActionReport {
    const kind = operation.kind;
    return {
        id: createId('action'),
        stepId,
        kind,
        name:
            kind === 'api-call'
                ? `调用 ${operation.msgtype}`
                : kind === 'sql-query'
                  ? '查询 SQL'
                  : '执行 SQL',
        status: 'running',
        startedAt: Date.now(),
        durationMs: 0,
        request: operation,
    };
}

function exceedsLimits(actions: number, apiActions: number, sqlActions: number): boolean {
    return actions > MAX_ACTIONS || apiActions > MAX_API_ACTIONS || sqlActions > MAX_SQL_ACTIONS;
}

async function executeOperation(
    operation: WorkerOperation,
    environment: KcxpEnvironment,
    requestId: string,
): Promise<unknown> {
    if (operation.kind === 'sql-query') {
        if (!environment.database) throw new Error('当前环境未配置数据库');
        const result = await suggestRuntime.queryScript({
            sql: operation.sql,
            params: operation.params as Record<string, string | number> | undefined,
            databaseConfig: environment.database,
        });
        if (result.error) throw new Error(result.error);
        return result.rows;
    }
    if (operation.kind === 'sql-execute') {
        return automationRuntime.executeSql({
            requestId,
            environmentId: environment.id,
            sql: operation.sql,
            params: operation.params,
        });
    }
    const response = await apiCallRuntime.call(
        buildAutomationApiRequest(environment, {
            environmentId: environment.id,
            msgtype: operation.msgtype,
            fields: operation.fields as Parameters<typeof buildAutomationApiRequest>[1]['fields'],
        }),
    );
    return response;
}

interface RunCounters {
    actions: number;
    apiActions: number;
    sqlActions: number;
}

interface OperationContext {
    options: RunOptions;
    worker: Worker;
    builder: ReportBuilder;
    counters: RunCounters;
    setActiveSql: (id: string | null) => void;
}

async function handleWorkerOperation(
    message: Extract<WorkerOutboundMessage, { type: 'operation' }>,
    context: OperationContext,
): Promise<void> {
    const { options, worker, builder, counters, setActiveSql } = context;
    counters.actions += 1;
    if (message.operation.kind === 'api-call') counters.apiActions += 1;
    else counters.sqlActions += 1;
    const action = actionFor(message.operation, message.stepId);
    action.request = redactAutomationValue(
        action.request,
        (options.sensitiveInputNames ?? []).map((name) => options.inputs[name]),
    );
    if (exceedsLimits(counters.actions, counters.apiActions, counters.sqlActions)) {
        worker.postMessage({
            type: 'operation-result',
            id: message.id,
            error: '超过场景动作数量限制',
        } satisfies WorkerInboundMessage);
        return;
    }
    if (message.operation.kind === 'sql-execute') setActiveSql(message.id);
    try {
        const result = await executeOperation(message.operation, options.environment, message.id);
        action.status = 'passed';
        action.result = result;
        worker.postMessage({
            type: 'operation-result',
            id: message.id,
            result,
        } satisfies WorkerInboundMessage);
    } catch (error) {
        action.status = 'failed';
        action.error = messageOf(error);
        worker.postMessage({
            type: 'operation-result',
            id: message.id,
            error: action.error,
        } satisfies WorkerInboundMessage);
    } finally {
        action.durationMs = Date.now() - action.startedAt;
        builder.consume({ type: 'action-finished', action });
        if (message.operation.kind === 'sql-execute') setActiveSql(null);
    }
}

interface RunLifecycle {
    attach(worker: Worker, forceCancel: () => void): void;
    clear(worker: Worker): void;
    setActiveSql(id: string | null): void;
}

function executeAutomationRun(
    options: RunOptions,
    lifecycle: RunLifecycle,
): Promise<AutomationRunReport> {
    const worker = createWorker();
    const requestId = createId('worker-run');
    const builder = createReport(options);
    const counters: RunCounters = { actions: 0, apiActions: 0, sqlActions: 0 };
    return new Promise((resolve) => {
        let settled = false;
        const finish = (status: AutomationRunReport['status'], error?: string, forced = false) => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timer);
            worker.terminate();
            lifecycle.clear(worker);
            const report = builder.finish(status, error);
            if (forced) {
                report.forcedTermination = true;
                report.cleanupSkipped = true;
            }
            resolve(report);
        };
        const timer = window.setTimeout(
            () => finish('failed', '场景运行超过 5 分钟，已强制终止', true),
            RUN_TIMEOUT_MS,
        );
        lifecycle.attach(worker, () =>
            finish('cancelled', '取消宽限期已结束，Worker 已强制终止且清理未完成', true),
        );
        worker.onmessage = (event: MessageEvent<WorkerOutboundMessage>) => {
            const message = event.data;
            if (message.type === 'progress') {
                if (
                    message.event.type === 'action-finished' &&
                    !['api-call', 'sql-query', 'sql-execute'].includes(message.event.action.kind)
                )
                    counters.actions += 1;
                if (counters.actions > MAX_ACTIONS)
                    return finish('failed', '超过场景动作数量限制', true);
                builder.consume(message.event);
                return;
            }
            if (message.type === 'finished' && message.id === requestId)
                return finish(message.status, message.error);
            if (message.type === 'operation')
                void handleWorkerOperation(message, {
                    options,
                    worker,
                    builder,
                    counters,
                    setActiveSql: lifecycle.setActiveSql,
                });
        };
        worker.onerror = (event) => finish('failed', event.message);
        worker.postMessage({
            type: 'run',
            id: requestId,
            script: options.scenario.script,
            inputs: options.inputs,
        } satisfies WorkerInboundMessage);
    });
}

export class AutomationRunController {
    private worker: Worker | null = null;
    private activeSqlRequestId: string | null = null;
    private forceCancel: (() => void) | null = null;

    async run(options: RunOptions): Promise<AutomationRunReport> {
        return executeAutomationRun(options, {
            attach: (worker, forceCancel) => {
                this.worker = worker;
                this.forceCancel = forceCancel;
            },
            clear: (worker) => {
                if (this.worker === worker) this.worker = null;
                this.forceCancel = null;
            },
            setActiveSql: (id) => {
                this.activeSqlRequestId = id;
            },
        });
    }

    async cancel(): Promise<void> {
        this.worker?.postMessage({ type: 'cancel' } satisfies WorkerInboundMessage);
        await Promise.all([
            apiCallRuntime.cancel(),
            this.activeSqlRequestId
                ? automationRuntime.cancelSql(this.activeSqlRequestId)
                : Promise.resolve(false),
        ]);
        const forceCancel = this.forceCancel;
        window.setTimeout(() => forceCancel?.(), 2000);
    }
}
