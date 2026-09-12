#!/usr/bin/env node
/**
 * 只运行与暂存改动相关的 Vitest 用例，供 pre-commit 使用。
 *
 * 目的：让测试进入提交链，同时避免每次提交都跑全量（138 文件 / 700 用例）。
 * 用 `vitest related` 依据暂存文件反查受影响的测试；无相关用例时直接跳过。
 *
 * 用法：node scripts/run-related-tests.mjs
 * 退出码：0 = 通过或无相关用例；非 0 = 相关用例失败（阻止提交）
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** 取暂存区新增/修改/重命名的文件（排除删除的文件）。 */
function stagedFiles() {
    const output = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], {
        cwd: root,
        encoding: 'utf8',
    });
    return output
        .split('\n')
        .map((line) => line.trim().replaceAll('\\', '/'))
        .filter(Boolean);
}

const TESTABLE = /^(?:src|electron)\/.+\.(?:ts|tsx)$/;
const SKIP = /\.d\.ts$/;

const files = stagedFiles().filter((file) => TESTABLE.test(file) && !SKIP.test(file));

if (files.length === 0) {
    console.log('[related-tests] 暂存区没有可测试的 TS/TSX 文件，跳过');
    process.exit(0);
}

console.log(`[related-tests] 基于 ${files.length} 个暂存文件运行相关用例...`);
const result = spawnSync('npx', ['vitest', 'related', '--run', '--passWithNoTests', ...files], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
});

if (result.status !== 0) {
    console.error('[related-tests] 相关用例失败，提交已阻止');
}
process.exit(result.status ?? 1);
