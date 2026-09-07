#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

const MAX_STAGED_FILE_BYTES = 5 * 1024 * 1024;
const BLOCKED_PATH = /^(?:dist|dist-electron|coverage|release)\//;
const CONTENT_FILE = /\.(?:[cm]?[jt]sx?|json|ya?ml|env|ini|cfg|config)$/i;
// Flag literal credentials, but allow ordinary config-field plumbing such as
// `password: partial?.password` or `config.password = value`.
const SENSITIVE =
    /\b(?:password|passwd|pwd|token|secret|connectionstring)\s*(?::(?!:)|=(?!=))\s*(?:['"`][^'"`\r\n]+['"`]|\d+)/i;
const DOC_SESSION = />_ OpenAI Codex|Model provider:|Token usage:|Context window:|Session:\s+[0-9a-f-]{16,}/i;

function stagedFiles() {
    const output = execFileSync('git', ['diff', '--cached', '--name-only', '-z'], { encoding: 'utf8' });
    return output.split('\0').filter(Boolean).map((file) => file.replaceAll('\\', '/'));
}

const files = stagedFiles();
const errors = [];

for (const file of files) {
    if (BLOCKED_PATH.test(file)) errors.push(`绂佹鎻愪氦鏋勫缓鎴栧彂甯冧骇鐗╋細${file}`);
    try {
        if (statSync(file).size > MAX_STAGED_FILE_BYTES) errors.push(`鏆傚瓨鏂囦欢瓒呰繃 5MB锛?{file}`);
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
        errors.push(`鐤戜技鏁忔劅瀛楅潰閲忥細${file}`);
    }
    if (file.startsWith('docs/') && DOC_SESSION.test(content)) {
        errors.push(`鏂囨。鍖呭惈浼氳瘽杩囩▼鍏冧俊鎭細${file}`);
    }
}

if (errors.length > 0) {
    console.error(errors.map((error) => `鉁?${error}`).join('\n'));
    process.exitCode = 1;
} else {
    console.log(`[staged-guards] ${files.length} staged file(s) passed`);
}
