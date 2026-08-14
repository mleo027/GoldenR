import type { BuiltinLib } from '../lib/builtin';
import { builtinLib } from '../lib/builtin';

export type CustomLibExports = Record<string, unknown>;

export function mergeLibApi(custom: CustomLibExports = {}): BuiltinLib & CustomLibExports {
    return {
        ...builtinLib,
        ...custom,
        custom,
    };
}

export function parseCustomLibFromScript(source: string, filename: string): CustomLibExports {
    const trimmed = source.trim();
    if (!trimmed) return {};

    try {
        const runner = new Function(
            'exports',
            'module',
            `"use strict";
${trimmed}
if (typeof module !== "undefined" && module.exports && Object.keys(module.exports).length) {
  return module.exports;
}
if (typeof exports !== "undefined" && Object.keys(exports).length) {
  return exports;
}
return {};`,
        ) as (exports: CustomLibExports, module: { exports: CustomLibExports }) => CustomLibExports;

        const module = { exports: {} as CustomLibExports };
        const result = runner(module.exports, module);
        return result && typeof result === 'object' ? (result as CustomLibExports) : module.exports;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`加载 test-lib ${filename} 失败: ${message}`);
    }
}
