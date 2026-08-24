#!/usr/bin/env node
/** Keep UI colors centralized in theme tokens instead of growing one-off literals. */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MAX_UNIQUE_COLORS = 36;
const MAX_COLORS_PER_FILE = 14;
const SOURCE = /^(?:src|electron)\/.+\.(?:css|tsx?|jsx?)$/i;
const TEST = /(?:\.test\.|\.spec\.)/i;
const EXEMPT = [
    /(^|\/)tokens\.css$/i,
    /(^|\/)AppThemeProvider\.tsx$/i,
    /(^|\/)scriptEditorTheme\.ts$/i,
    /(^|\/)AppearanceSettings\.tsx$/i,
];
const COLOR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\([^)]*\)/gi;

function sourceFiles(directory) {
    const files = [];
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const file = join(directory, entry.name).replaceAll('\\', '/');
        if (entry.isDirectory()) files.push(...sourceFiles(file));
        else if (SOURCE.test(file) && !TEST.test(file) && !EXEMPT.some((rule) => rule.test(file))) files.push(file);
    }
    return files;
}

const files = [...sourceFiles('src'), ...sourceFiles('electron')];
const colors = new Map();
const errors = [];

for (const file of files) {
    const content = readFileSync(file, 'utf8');
    const found = [...content.matchAll(COLOR)].map((match) => match[0].toLowerCase());
    const unique = [...new Set(found)];
    for (const color of unique) colors.set(color, (colors.get(color) ?? 0) + 1);
    if (unique.length > MAX_COLORS_PER_FILE) {
        errors.push(`${file} 使用 ${unique.length} 个硬编码颜色（上限 ${MAX_COLORS_PER_FILE}），请改用 tokens.css 语义变量`);
    }
}

if (colors.size > MAX_UNIQUE_COLORS) {
    errors.push(`项目共使用 ${colors.size} 个非主题颜色（上限 ${MAX_UNIQUE_COLORS}），请复用现有 token 或先登记语义颜色`);
}

if (errors.length) {
    console.error(errors.map((error) => `✖ ${error}`).join('\n'));
    process.exitCode = 1;
} else {
    console.log(`[color-budget] ${colors.size} unique non-token colors within budget (${MAX_UNIQUE_COLORS})`);
}
