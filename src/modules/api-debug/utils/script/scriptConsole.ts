import type {
    ScriptConsoleEntry,
    ScriptConsoleLevel,
    ScriptConsoleSnapshot,
} from '../../types/scriptConsole';
import { formatScriptOutput } from './apiScript';

export interface ScriptConsoleApi {
    log: (...args: unknown[]) => void;
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
}

export interface ScriptConsoleCapture {
    api: ScriptConsoleApi;
    snapshot: () => ScriptConsoleSnapshot;
    append: (level: ScriptConsoleLevel, message: string) => void;
    clear: () => void;
}

function formatConsoleArgs(args: unknown[]): string {
    if (args.length === 0) return '';
    return args
        .map((arg) => {
            if (typeof arg === 'string') return arg;
            return formatScriptOutput(arg);
        })
        .join(' ');
}

export function createScriptConsole(ranAt = Date.now()): ScriptConsoleCapture {
    const entries: ScriptConsoleEntry[] = [];

    const append = (level: ScriptConsoleLevel, message: string) => {
        const trimmed = message.trim();
        if (!trimmed) return;
        entries.push({
            level,
            message: trimmed,
            timestamp: Date.now(),
        });
    };

    const api: ScriptConsoleApi = {
        log: (...args) => append('log', formatConsoleArgs(args)),
        info: (...args) => append('info', formatConsoleArgs(args)),
        warn: (...args) => append('warn', formatConsoleArgs(args)),
        error: (...args) => append('error', formatConsoleArgs(args)),
    };

    return {
        api,
        append,
        clear: () => {
            entries.length = 0;
        },
        snapshot: () => ({
            entries: [...entries],
            ranAt,
        }),
    };
}
