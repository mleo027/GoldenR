#!/usr/bin/env node
/**
 * 扫描 src/、electron/ 中疑似损坏的中文 UI 文案（问号占位、UTF-8 乱码）。
 *
 * 用法：node scripts/scan-garbled-strings.mjs
 * 退出码：0 = 无命中，1 = 存在疑似损坏行
 */
import fs from 'node:fs';
import path from 'node:path';

const SKIP_DIRS = new Set(['node_modules', 'dist', 'dist-electron', 'scripts']);
const SCAN_ROOTS = ['src', 'electron'];
const FILE_RE = /\.(tsx?|jsx?|css|md)$/;

const MOJIBAKE_RE = /(?:ç|ä|æ–|åˆ|ï¿|é‡|è„|Ã[^\w]|Â[^\w])/;

function walk(dir, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const filePath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (SKIP_DIRS.has(entry.name)) continue;
            walk(filePath, out);
        } else if (FILE_RE.test(entry.name)) {
            out.push(filePath);
        }
    }
    return out;
}

/** 去掉 JS 里合法的 ? 用法，避免把 ?? / ?. / split('?') 误判为乱码 */
function stripBenignQuestionSyntax(line) {
    return line
        .replace(/\?\?/g, '')
        .replace(/\?\./g, '.')
        .replace(/split\(['"]\?['"]\)/g, 'split("")')
        .replace(/legacy-[^`'"]*/g, '');
}

function hasGarbledQuestionMarks(line) {
    const probe = stripBenignQuestionSyntax(line);
    if (!/\?{2,}/.test(probe)) return false;

    if (/['"`](?:[^'"`\\]|\\.)*\?{2,}(?:[^'"`\\]|\\.)*['"`]/.test(line)) return true;
    if (/^\s+\?{2,}\s*$/.test(line)) return true;
    if (/(?<![=-])>\s*[^<{]*\?{2,}/.test(line)) return true;
    if (/message\.(success|error|warning|info)\(\s*['"`][^'"`]*\?{2,}/.test(line)) return true;
    if (
        /(?:title|label|placeholder|description|content|okText|cancelText|extra)=\{?['"][^'"]*\?{2,}/.test(
            line,
        )
    ) {
        return true;
    }
    return false;
}

function isCorruptedLine(line) {
    if (MOJIBAKE_RE.test(line)) return true;
    return hasGarbledQuestionMarks(line);
}

const byFile = new Map();
const allFiles = SCAN_ROOTS.flatMap((root) => walk(root));
for (const filePath of allFiles) {
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    const fileHits = [];
    lines.forEach((line, index) => {
        if (isCorruptedLine(line)) {
            fileHits.push({ line: index + 1, text: line.trim().slice(0, 160) });
        }
    });
    if (fileHits.length) byFile.set(filePath, fileHits);
}

let total = 0;
for (const [filePath, fileHits] of [...byFile.entries()].sort()) {
    total += fileHits.length;
    console.log(`\n${filePath} (${fileHits.length})`);
    for (const hit of fileHits) console.log(`  ${hit.line}: ${hit.text}`);
}

console.log(`\nTotal: ${total} lines in ${byFile.size} files`);
process.exit(total > 0 ? 1 : 0);
