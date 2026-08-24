#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

const MAX_STAGED_FILE_BYTES = 5 * 1024 * 1024;
const BLOCKED_PATH = /^(?:dist|dist-electron|coverage|release)\//;
const CONTENT_FILE = /\.(?:[cm]?[jt]sx?|json|ya?ml|env|ini|cfg|config)$/i;
const SENSITIVE = /\b(?:password|passwd|pwd|token|secret|connectionstring)\s*[:=]\s*[^\s,;'"}`]+/i;
const DOC_SESSION = />_ OpenAI Codex|Model provider:|Token usage:|Context window:|Session:\s+[0-9a-f-]{16,}/i;

function stagedFiles() {
    const output = execFileSync('git', ['diff', '--cached', '--name-only', '-z'], { encoding: 'utf8' });
    return output.split('\0').filter(Boolean).map((file) => file.replaceAll('\\', '/'));
}

const files = stagedFiles();
const errors = [];

for (const file of files) {
    if (BLOCKED_PATH.test(file)) errors.push(`禁止提交构建或发布产物：${file}`);
    try {
        if (statSync(file).size > MAX_STAGED_FILE_BYTES) errors.push(`暂存文件超过 5MB：${file}`);
    } catch {
        // Deleted files have no working-tree stat and are safe to ignore here.
    }
    if (!CONTENT_FILE.test(file)) continue;
    let content;
    try {
        content = readFileSync(file, 'utf8');
    } catch {
        continue;
    }
    if (SENSITIVE.test(content) && !file.endsWith('src/components/theme/AppThemeProvider.tsx')) {
        errors.push(`疑似敏感字面量：${file}`);
    }
    if (file.startsWith('docs/') && DOC_SESSION.test(content)) {
        errors.push(`文档包含会话过程元信息：${file}`);
    }
}

if (errors.length > 0) {
    console.error(errors.map((error) => `✖ ${error}`).join('\n'));
    process.exitCode = 1;
} else {
    console.log(`[staged-guards] ${files.length} staged file(s) passed`);
}
