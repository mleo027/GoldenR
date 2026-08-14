export type ScriptConsoleLevel =
    | 'log'
    | 'info'
    | 'warn'
    | 'error'
    | 'return'
    | 'step'
    | 'pass'
    | 'fail';

export interface ScriptConsoleEntry {
    level: ScriptConsoleLevel;
    message: string;
    timestamp: number;
}

export interface ScriptConsoleSnapshot {
    entries: ScriptConsoleEntry[];
    ranAt: number;
}
