import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const eslintBin = path.join(rootDir, '..', 'node_modules', 'eslint', 'bin', 'eslint.js');

const rules = [
    'complexity: [error, { max: 15 }]',
    'max-lines: [error, { max: 600, skipBlankLines: true, skipComments: true }]',
    'max-lines-per-function: [error, { max: 100, skipBlankLines: true, skipComments: true }]',
    'max-params: [error, { max: 5 }]',
    'max-depth: [error, { max: 4 }]',
];

const args = [eslintBin, '--format', 'json'];
for (const rule of rules) {
    args.push('--rule', rule);
}
args.push('.');

let stdout;
try {
    stdout = execFileSync(process.execPath, args, {
        cwd: path.join(rootDir, '..'),
        encoding: 'utf8',
    });
} catch (error) {
    stdout = error.stdout;
}
const results = JSON.parse(stdout);
const violations = results.flatMap((result) =>
    result.messages
        .filter(
            (message) =>
                message.ruleId?.startsWith('complexity') || message.ruleId?.startsWith('max-'),
        )
        .map((message) => ({
            file: result.filePath,
            line: message.line,
            rule: message.ruleId,
            message: message.message,
        })),
);

const baseline = 46;
console.log(`Complexity baseline violations: ${violations.length} (allowed baseline: ${baseline})`);
for (const violation of violations) {
    console.log(`${violation.file}:${violation.line} [${violation.rule}] ${violation.message}`);
}
if (violations.length > baseline) {
    console.error(`Complexity regression: ${violations.length - baseline} new violation(s)`);
    process.exitCode = 1;
}
