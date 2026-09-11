#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';

const MAX_STAGED_FILE_BYTES = 5 * 1024 * 1024;
const BLOCKED_PATH = /^(?:dist|dist-electron|coverage|release)\//;
const CONTENT_FILE = /\.(?:[cm]?[jt]sx?|json|ya?ml|env|ini|cfg|config)$/i;
// Credential-ish key names tolerate CamelCase prefixes (`AppSecret`), separator
// suffixes (`secret_key`) and the closing quote of a JSON key (`"app_secret":`).
const SENSITIVE_KEY =
    '[\\w.-]*(?:password|passwd|pwd|token|secret|private[_-]?key|api[_-]?key|access[_-]?key|connectionstring)[\\w.-]*';
// Quoted literals: a credential key in JSON, an object literal or an `=` field.
const SENSITIVE_QUOTED = new RegExp(
    `${SENSITIVE_KEY}["']?\\s*(?::(?!:)|=(?!=))\\s*['"\`][^'"\`\\r\\n]+['"\`]`,
    'i',
);
// Unquoted INI/env assignment values. Requiring a digit keeps declarations such as
// declarations like `export type PasswordProps = InputProps` out.
const SENSITIVE_UNQUOTED = new RegExp(
    `${SENSITIVE_KEY}["']?\\s*(?::(?!:)|=(?!=))\\s*(?=[A-Za-z0-9+/=_-]*\\d)[A-Za-z0-9+/=_-]{8,}`,
    'i',
);
// Bare numbers keep the strict key boundary so `tokenLimit = 500` is not flagged.
const SENSITIVE_NUMERIC =
    /\b(?:password|passwd|pwd|token|secret|connectionstring)\s*(?::(?!:)|=(?!=))\s*\d+/i;
function isSensitive(content) {
    return (
        SENSITIVE_QUOTED.test(content) ||
        SENSITIVE_UNQUOTED.test(content) ||
        SENSITIVE_NUMERIC.test(content)
    );
}
const DOC_SESSION =
    />_ OpenAI Codex|Model provider:|Token usage:|Context window:|Session:\s+[0-9a-f-]{16,}/i;

function stagedFiles() {
    const output = execFileSync('git', ['diff', '--cached', '--name-only', '-z'], {
        encoding: 'utf8',
    });
    return output
        .split('\0')
        .filter(Boolean)
        .map((file) => file.replaceAll('\\', '/'));
}

function addedLines(file) {
    // Only the lines this commit adds are inspected. Scanning whole files would block
    // any edit to a file that already holds test fixtures, while a newly added literal
    // is still reported.
    const diff = execFileSync(
        'git',
        ['diff', '--cached', '--unified=0', '--no-color', '--', file],
        { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
    );
    return diff.split('\n').filter((line) => line.startsWith('+') && !line.startsWith('+++'));
}

const files = stagedFiles();
const errors = [];

for (const file of files) {
    if (BLOCKED_PATH.test(file)) errors.push(`绂佹鎻愪氦鏋勫缓鎴栧彂甯冧骇鐗╋細${file}`);
    try {
        if (statSync(file).size > MAX_STAGED_FILE_BYTES)
            errors.push(`鏆傚瓨鏂囦欢瓒呰繃 5MB锛?{file}`);
    } catch {
        // Deleted files have no working-tree stat and are safe to ignore here.
    }
    if (!CONTENT_FILE.test(file)) continue;
    const addedText = addedLines(file).join('\n');
    if (isSensitive(addedText) && !file.endsWith('src/components/theme/AppThemeProvider.tsx')) {
        errors.push(`鐤戜技鏁忔劅瀛楅潰閲忥細${file}`);
    }
    if (file.startsWith('docs/') && DOC_SESSION.test(addedText)) {
        errors.push(`鏂囨。鍖呭惈浼氳瘽杩囩▼鍏冧俊鎭細${file}`);
    }
}

if (errors.length > 0) {
    console.error(errors.map((error) => `鉁?${error}`).join('\n'));
    process.exitCode = 1;
} else {
    console.log(`[staged-guards] ${files.length} staged file(s) passed`);
}
