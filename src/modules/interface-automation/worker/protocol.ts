import type {
    AutomationInputValues,
    AutomationProgressEvent,
    AutomationScenarioMetadata,
    AutomationSqlParams,
} from '@/shared/automation/types';

export type WorkerOperation =
    | { kind: 'sql-query'; sql: string; params?: AutomationSqlParams }
    | { kind: 'sql-execute'; sql: string; params?: AutomationSqlParams }
    | { kind: 'api-call'; msgtype: string; fields: Record<string, unknown> };

export type WorkerInboundMessage =
    | { type: 'inspect'; id: string; script: string }
    | { type: 'run'; id: string; script: string; inputs: AutomationInputValues }
    | { type: 'operation-result'; id: string; result?: unknown; error?: string }
    | { type: 'cancel' };

export type WorkerOutboundMessage =
    | { type: 'inspected'; id: string; metadata?: AutomationScenarioMetadata; error?: string }
    | { type: 'operation'; id: string; operation: WorkerOperation; stepId?: string }
    | { type: 'progress'; event: AutomationProgressEvent }
    | { type: 'finished'; id: string; status: 'passed' | 'failed' | 'cancelled'; error?: string };
