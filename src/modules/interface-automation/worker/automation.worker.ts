/// <reference lib="webworker" />
import type {
    AutomationActionReport,
    AutomationInputValue,
    AutomationInputValues,
    AutomationRunStatus,
    AutomationScenarioMetadata,
    ScenarioInputDefinition,
} from '@/shared/automation/types';
import type { WorkerInboundMessage, WorkerOperation, WorkerOutboundMessage } from './protocol';

type ScenarioHandler = (runtime: ScenarioRuntime) => Promise<void> | void;
type Cleanup = { name: string; callback: () => Promise<void> | void };
type Matcher = Record<string, (...args: unknown[]) => void>;

let registration: { metadata: AutomationScenarioMetadata; handler: ScenarioHandler } | null = null;
let sequence = 0;
let cancelled = false;
let softFailed = false;
let cleanupRunning = false;
const pending = new Map<
    string,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
>();

const emit = (message: WorkerOutboundMessage) => self.postMessage(message);
const id = (prefix: string) => `${prefix}-${Date.now()}-${++sequence}`;

const input = {
    string: (options: Omit<Extract<ScenarioInputDefinition, { type: 'string' }>, 'type'> = {}) => ({
        type: 'string',
        ...options,
    }),
    number: (options: Omit<Extract<ScenarioInputDefinition, { type: 'number' }>, 'type'> = {}) => ({
        type: 'number',
        ...options,
    }),
    boolean: (
        options: Omit<Extract<ScenarioInputDefinition, { type: 'boolean' }>, 'type'> = {},
    ) => ({ type: 'boolean', ...options }),
    select: (options: Omit<Extract<ScenarioInputDefinition, { type: 'select' }>, 'type'>) => ({
        type: 'select',
        ...options,
    }),
};

function registerScenario(metadata: AutomationScenarioMetadata, handler: ScenarioHandler): void {
    if (registration) throw new Error('每份脚本只能声明一个 scenario');
    if (!metadata || typeof metadata !== 'object' || typeof handler !== 'function')
        throw new Error('scenario 声明无效');
    registration = { metadata, handler };
}

function validateMetadata(metadata: AutomationScenarioMetadata): void {
    if (metadata.inputs === undefined) return;
    if (!metadata.inputs || typeof metadata.inputs !== 'object' || Array.isArray(metadata.inputs)) {
        throw new Error('scenario.inputs 必须是对象');
    }
    for (const [name, definition] of Object.entries(metadata.inputs)) {
        if (!definition || !['string', 'number', 'boolean', 'select'].includes(definition.type)) {
            throw new Error(`输入 ${name} 的类型无效`);
        }
        if (definition.type === 'select' && !Array.isArray(definition.options)) {
            throw new Error(`选择输入 ${name} 缺少 options`);
        }
    }
}

function compile(script: string) {
    registration = null;
    const run = new Function(
        'scenario',
        'input',
        'self',
        'globalThis',
        'fetch',
        'XMLHttpRequest',
        'WebSocket',
        'importScripts',
        'postMessage',
        'console',
        'process',
        'require',
        'Function',
        `"use strict";\n${script}`,
    );
    run(
        registerScenario,
        input,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
    );
    const compiled = registration as unknown as {
        metadata: AutomationScenarioMetadata;
        handler: ScenarioHandler;
    } | null;
    if (!compiled) throw new Error('请声明 scenario(metadata, handler)');
    validateMetadata(compiled.metadata);
    return compiled;
}

function rpc(operation: WorkerOperation, stepId?: string): Promise<unknown> {
    if (cancelled && !cleanupRunning) return Promise.reject(new Error('运行已取消'));
    const requestId = id('operation');
    emit({ type: 'operation', id: requestId, operation, stepId });
    return new Promise((resolve, reject) => {
        pending.set(requestId, { resolve, reject });
    });
}

function deepEqual(left: unknown, right: unknown): boolean {
    return JSON.stringify(left) === JSON.stringify(right);
}

function matchesObject(actual: unknown, expected: unknown): boolean {
    if (!actual || !expected || typeof actual !== 'object' || typeof expected !== 'object')
        return false;
    return Object.entries(expected).every(([key, value]) =>
        deepEqual((actual as Record<string, unknown>)[key], value),
    );
}

function createExpect(stepStack: string[]) {
    const report = (name: string, passed: boolean, error?: string) => {
        const now = Date.now();
        const action: AutomationActionReport = {
            id: id('assert'),
            stepId: stepStack.at(-1),
            kind: 'assertion',
            name,
            status: passed ? 'passed' : 'failed',
            startedAt: now,
            durationMs: 0,
            error,
        };
        emit({ type: 'progress', event: { type: 'action-finished', action } });
    };
    const expectValue = (actual: unknown, description = '断言', soft = false): Matcher => {
        const verify = (passed: boolean, detail: string) => {
            report(description, passed, passed ? undefined : detail);
            if (passed) return;
            if (soft) softFailed = true;
            else throw new Error(`${description}: ${detail}`);
        };
        return {
            toBe: (expected) =>
                verify(
                    Object.is(actual, expected),
                    `期望 ${String(expected)}，实际 ${String(actual)}`,
                ),
            toEqual: (expected) => verify(deepEqual(actual, expected), '值不相等'),
            toBeTruthy: () => verify(Boolean(actual), '期望为真值'),
            toContain: (expected) =>
                verify(
                    typeof actual === 'string'
                        ? actual.includes(String(expected))
                        : Array.isArray(actual) && actual.some((item) => deepEqual(item, expected)),
                    '未包含期望值',
                ),
            toHaveLength: (expected) =>
                verify(
                    Boolean(
                        actual &&
                        typeof (actual as { length?: unknown }).length === 'number' &&
                        (actual as { length: number }).length === expected,
                    ),
                    `长度不是 ${String(expected)}`,
                ),
            toMatchObject: (expected) => verify(matchesObject(actual, expected), '对象字段不匹配'),
            toHaveRow: (expected) =>
                verify(
                    Array.isArray(actual) && actual.some((row) => matchesObject(row, expected)),
                    '未找到匹配行',
                ),
            toChangeBy: (before, delta) =>
                verify(
                    Math.abs(Number(actual) - Number(before) - Number(delta)) < 1e-8,
                    `变化量不是 ${String(delta)}`,
                ),
            businessOk: () =>
                verify(
                    Boolean(
                        actual &&
                        typeof actual === 'object' &&
                        String((actual as { code?: unknown }).code) === '0',
                    ),
                    `业务码为 ${String((actual as { code?: unknown } | null)?.code)}`,
                ),
        };
    };
    return Object.assign(
        (actual: unknown, description?: string) => expectValue(actual, description),
        { soft: (actual: unknown, description?: string) => expectValue(actual, description, true) },
    );
}

function buildRuntime(values: AutomationInputValues): {
    runtime: ScenarioRuntime;
    cleanups: Cleanup[];
} {
    const stepStack: string[] = [];
    const cleanups: Cleanup[] = [];
    const variables: Record<string, unknown> = {};
    const expect = createExpect(stepStack);
    const runtime: ScenarioRuntime = {
        input: Object.freeze({ ...values }),
        async step(name, callback) {
            if (stepStack.length >= 8) throw new Error('步骤嵌套不能超过 8 层');
            const stepId = id('step');
            const parentId = stepStack.at(-1);
            const startedAt = Date.now();
            emit({
                type: 'progress',
                event: { type: 'step-started', stepId, name, depth: stepStack.length, parentId },
            });
            stepStack.push(stepId);
            try {
                const result = await callback();
                emit({
                    type: 'progress',
                    event: { type: 'step-finished', stepId, status: 'passed' },
                });
                return result;
            } catch (error) {
                emit({
                    type: 'progress',
                    event: {
                        type: 'step-finished',
                        stepId,
                        status: cancelled ? 'cancelled' : 'failed',
                        error: error instanceof Error ? error.message : String(error),
                    },
                });
                throw error;
            } finally {
                stepStack.pop();
                void startedAt;
            }
        },
        cleanup(name, callback) {
            cleanups.push({ name, callback });
        },
        sql: {
            query: (sql, params) =>
                rpc({ kind: 'sql-query', sql, params }, stepStack.at(-1)) as Promise<
                    Record<string, unknown>[]
                >,
            execute: (sql, params) => rpc({ kind: 'sql-execute', sql, params }, stepStack.at(-1)),
        },
        api: {
            call: (msgtype, fields) => rpc({ kind: 'api-call', msgtype, fields }, stepStack.at(-1)),
        },
        vars: {
            get: (name) => variables[name],
            set(name, value) {
                variables[name] = value;
                const now = Date.now();
                emit({
                    type: 'progress',
                    event: {
                        type: 'action-finished',
                        action: {
                            id: id('variable'),
                            stepId: stepStack.at(-1),
                            kind: 'variable',
                            name: `设置变量 ${name}`,
                            status: 'passed',
                            startedAt: now,
                            durationMs: 0,
                            result: value,
                        },
                    },
                });
            },
            all: () => ({ ...variables }),
        },
        expect,
        log: (...args) => logAction('log', args, stepStack.at(-1)),
        info: (...args) => logAction('info', args, stepStack.at(-1)),
        warn: (...args) => logAction('warn', args, stepStack.at(-1)),
    };
    return { runtime, cleanups };
}

function logAction(level: string, args: unknown[], stepId?: string) {
    const now = Date.now();
    emit({
        type: 'progress',
        event: {
            type: 'action-finished',
            action: {
                id: id('log'),
                stepId,
                kind: 'log',
                name: level,
                status: 'passed',
                startedAt: now,
                durationMs: 0,
                result: args,
            },
        },
    });
}

interface ScenarioRuntime {
    input: AutomationInputValues;
    step<T>(name: string, callback: () => Promise<T> | T): Promise<T>;
    cleanup(name: string, callback: () => Promise<void> | void): void;
    sql: {
        query(
            sql: string,
            params?: Record<string, AutomationInputValue>,
        ): Promise<Record<string, unknown>[]>;
        execute(sql: string, params?: Record<string, AutomationInputValue>): Promise<unknown>;
    };
    api: { call(msgtype: string, fields: Record<string, unknown>): Promise<unknown> };
    vars: {
        get(name: string): unknown;
        set(name: string, value: unknown): void;
        all(): Record<string, unknown>;
    };
    expect: ((actual: unknown, description?: string) => Matcher) & {
        soft(actual: unknown, description?: string): Matcher;
    };
    log(...args: unknown[]): void;
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
}

async function executeCleanup(runtime: ScenarioRuntime, cleanup: Cleanup): Promise<void> {
    await runtime.step(`清理：${cleanup.name}`, async () => {
        const startedAt = Date.now();
        const action: AutomationActionReport = {
            id: id('cleanup'),
            kind: 'cleanup',
            name: cleanup.name,
            status: 'running',
            startedAt,
            durationMs: 0,
        };
        try {
            await cleanup.callback();
            action.status = 'passed';
        } catch (error) {
            action.status = 'failed';
            action.error = error instanceof Error ? error.message : String(error);
            throw error;
        } finally {
            action.durationMs = Date.now() - startedAt;
            emit({ type: 'progress', event: { type: 'action-finished', action } });
        }
    });
}

async function runScenario(message: Extract<WorkerInboundMessage, { type: 'run' }>) {
    cancelled = false;
    softFailed = false;
    cleanupRunning = false;
    const compiled = compile(message.script);
    const { runtime, cleanups } = buildRuntime(message.inputs);
    let status: AutomationRunStatus = 'passed';
    let error: string | undefined;
    try {
        await compiled.handler(runtime);
    } catch (reason) {
        status = cancelled ? 'cancelled' : 'failed';
        error = reason instanceof Error ? reason.message : String(reason);
    }
    cleanupRunning = true;
    for (const cleanup of cleanups.reverse()) {
        try {
            await executeCleanup(runtime, cleanup);
        } catch (reason) {
            status = 'failed';
            error = error ?? (reason instanceof Error ? reason.message : String(reason));
        }
    }
    cleanupRunning = false;
    if (softFailed && status === 'passed') {
        status = 'failed';
        error = '存在未通过的软断言';
    }
    emit({
        type: 'finished',
        id: message.id,
        status: status as 'passed' | 'failed' | 'cancelled',
        error,
    });
}

self.onmessage = (event: MessageEvent<WorkerInboundMessage>) => {
    const message = event.data;
    if (message.type === 'inspect') {
        try {
            emit({ type: 'inspected', id: message.id, metadata: compile(message.script).metadata });
        } catch (error) {
            emit({
                type: 'inspected',
                id: message.id,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    } else if (message.type === 'run') void runScenario(message);
    else if (message.type === 'operation-result') {
        const request = pending.get(message.id);
        if (!request) return;
        pending.delete(message.id);
        if (message.error) request.reject(new Error(message.error));
        else request.resolve(message.result);
    } else if (message.type === 'cancel') {
        cancelled = true;
        for (const request of pending.values()) request.reject(new Error('运行已取消'));
        pending.clear();
    }
};

export {};
