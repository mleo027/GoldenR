import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 准备可整体替换的 Agent sidecar（`agent/`）。
 *
 * `agent/` 是独立层：它有自己的 package.json 与依赖树，不进主仓库的依赖。
 * 升级 Pi 只需要替换整个 `agent/` 目录，再跑一次本脚本安装它自己的依赖。
 */
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const agentDir = path.join(rootDir, 'agent');
const manifestPath = path.join(agentDir, 'package.json');

if (!fs.existsSync(manifestPath)) {
    console.error(`[prepare-agent] 找不到 ${path.relative(rootDir, manifestPath)}`);
    process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const entry = path.join(agentDir, manifest.main ?? 'main.mjs');

if (!fs.existsSync(entry)) {
    console.error(`[prepare-agent] 找不到 sidecar 入口 ${path.relative(rootDir, entry)}`);
    process.exit(1);
}

const dependencies = Object.keys(manifest.dependencies ?? {});
if (dependencies.length === 0) {
    console.log(`[prepare-agent] sidecar ${manifest.name}@${manifest.version} 无自有依赖，跳过安装`);
    process.exit(0);
}

console.log(`[prepare-agent] 安装 ${dependencies.length} 个 sidecar 依赖...`);
execFileSync('npm', ['install', '--omit=dev', '--no-audit', '--no-fund'], {
    cwd: agentDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
});
console.log('[prepare-agent] sidecar 依赖就绪');
