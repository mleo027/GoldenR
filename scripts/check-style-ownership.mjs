#!/usr/bin/env node
/**
 * 强制 src/styles 的分层归属，并对未引用类名设棘轮上限。
 *
 * 分层模型（与 renderer 分层一致）：
 *   foundation/   全局基元（tokens / base / motion），任何层都可消费
 *   primitives/   ga-* UI 原语，任何层都可消费
 *   shell/        平台外壳（标题栏 / 活动栏 / 面板布局），允许 platform + components + modules 消费
 *   shared/       跨模块共享 UI，允许 components + platform + modules + utils 等消费
 *   modules/<m>/  模块专属，只允许 src/modules/<m>/ 消费
 *
 * 用法：
 *   node scripts/check-style-ownership.mjs          # 校验（供 npm run check 调用）
 *   node scripts/check-style-ownership.mjs --list   # 打印违规与死类明细
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// 第三方选择器（Ant Design / CodeMirror / rc-*）不是本项目的类名，不计入。
const VENDOR = ['ant-', 'anticon-', 'cm-', 'rc-', 'monaco-', 'codemirror-'];
const CLASS_RE = /[.]([a-zA-Z][a-zA-Z0-9-]*)/g;
const list = process.argv.includes('--list');

// 棘轮：当前实测的死类总数，只允许下降。删掉死类后请同步下调。
const DEAD_CLASS_BASELINE = 83;

// 已登记的跨层引用债：拆分 api-workspace.css / sidebar.css 时逐条消除。
// key = 相对 src/styles 的路径；value = 允许被上层消费的类名。
const LEGACY_CROSS_LAYER = new Map([
    [
        'modules/api-debug/api-workspace.css',
        [
            'section-header',
            'section-header-leading',
            'section-header-trailing',
            'response-table',
            'response-table-wrapper',
            'case-tab-bar-title',
            'case-tab-item-title',
            'case-tab-item-active',
        ],
    ],
    ['modules/api-debug/sidebar.css', ['case-sidebar-resize']],
]);

const norm = (p) => relative(root, p).split(sep).join('/');

function walk(dir, out = []) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path, out);
        else if (/[.](ts|tsx|css)$/.test(entry.name)) out.push(path);
    }
    return out;
}

const sources = walk(join(root, 'src'))
    .concat(walk(join(root, 'electron')))
    .map((path) => ({ rel: norm(path), text: readFileSync(path, 'utf8') }));

// 形如 `param-kpi-cell--${tone}` 的动态类名，把静态前缀登记为可解释前缀。
const dynamicPrefixes = new Set();
for (const source of sources) {
    for (const match of source.text.matchAll(/([a-zA-Z][a-zA-Z0-9_-]*-)\$\{/g)) {
        dynamicPrefixes.add(match[1]);
    }
}

const boundary = (cls) => new RegExp(`(?<![A-Za-z0-9_-])${cls}(?![A-Za-z0-9_-])`);

// 样式层自身（含 index.css 的 @import 路径）不算"消费者"。
const isStyleSpace = (rel) => rel.startsWith('src/styles/') || rel === 'src/index.css';

function layerOf(relPath) {
    const parts = relPath.replace('src/styles/', '').split('/');
    if (parts.length < 2) return null;
    if (parts[0] === 'modules') return parts.length >= 3 ? `modules/${parts[1]}` : null;
    return parts[0];
}

function allowedFor(layer) {
    if (layer === 'foundation' || layer === 'primitives') return null; // 无限制
    if (layer === 'shell') return ['src/platform', 'src/components', 'src/modules'];
    if (layer === 'shared') {
        return [
            'src/components',
            'src/platform',
            'src/modules',
            'src/utils',
            'src/lib',
            'src/hooks',
            'src/store',
            'src/shared',
        ];
    }
    if (layer.startsWith('modules/')) return [`src/modules/${layer.slice('modules/'.length)}`];
    return null;
}

const cssFiles = sources.filter(
    (s) => s.rel.startsWith('src/styles/') && s.rel.endsWith('.css') && !s.rel.endsWith('index.css'),
);

const misplaced = [];
const crossLayer = [];
const legacyUsed = new Set();
const deadByFile = new Map();
let deadTotal = 0;

for (const file of cssFiles) {
    const rel = file.rel.replace('src/styles/', '');
    const layer = layerOf(file.rel);
    if (!layer) {
        misplaced.push(rel);
        continue;
    }
    const allowed = allowedFor(layer);
    const classes = [...new Set([...file.text.matchAll(CLASS_RE)].map((m) => m[1]))].filter(
        (cls) => !VENDOR.some((prefix) => cls.startsWith(prefix)),
    );

    const dead = [];
    const legacy = new Set(LEGACY_CROSS_LAYER.get(rel) ?? []);

    for (const cls of classes) {
        const re = boundary(cls);
        let referenced = false;
        for (const source of sources) {
            if (source.rel === file.rel || !re.test(source.text)) continue;
            referenced = true;
            if (isStyleSpace(source.rel)) continue;
            if (allowed && !allowed.some((prefix) => source.rel.startsWith(prefix))) {
                if (legacy.has(cls)) legacyUsed.add(`${rel}::${cls}`);
                else crossLayer.push({ file: rel, cls, consumer: source.rel });
            }
        }
        if (!referenced && ![...dynamicPrefixes].some((prefix) => cls.startsWith(prefix))) dead.push(cls);
    }
    deadByFile.set(rel, dead);
    deadTotal += dead.length;
}

const problems = [];

if (misplaced.length) {
    problems.push(
        `以下样式表不在分层目录内：\n${misplaced.map((f) => `  - src/styles/${f}`).join('\n')}\n` +
            '  请放入 foundation / primitives / shell / shared / modules/<module> 之一。',
    );
}

if (crossLayer.length) {
    problems.push(
        `模块专属样式被上层消费（共 ${crossLayer.length} 处）：\n` +
            crossLayer.map((v) => `  - .${v.cls}  (${v.file})  ←  ${v.consumer}`).join('\n') +
            '\n  要么把该类拆到 shared/shell 层的样式表，要么登记到 LEGACY_CROSS_LAYER 债务清单。',
    );
}

if (deadTotal > DEAD_CLASS_BASELINE) {
    const lines = [];
    for (const [rel, dead] of [...deadByFile].sort()) {
        if (dead.length) lines.push(`  - ${rel}: ${dead.join(', ')}`);
    }
    problems.push(
        `未引用类名 ${deadTotal} 个，超过棘轮上限 ${DEAD_CLASS_BASELINE}：\n${lines.join('\n')}\n` +
            '  请删除死类；若确认仍在用，请把基线随之下调或补上动态类名前缀。',
    );
}

// 已登记的债务若已消失，提醒下调清单，避免棘轮松掉。
const staleLegacy = [];
for (const [rel, classes] of LEGACY_CROSS_LAYER) {
    for (const cls of classes) {
        // 登记项只有在"仍被上层消费"时才有存在意义；否则说明可以删掉这条债。
        if (!legacyUsed.has(`${rel}::${cls}`)) staleLegacy.push(`${cls} (${rel})`);
    }
}

if (list) {
    console.log('=== 各样式表未引用类名 ===');
    for (const [rel, dead] of [...deadByFile].sort()) {
        console.log(`${rel}  dead=${dead.length}${dead.length ? `: ${dead.join(', ')}` : ''}`);
    }
    console.log(`\nDEAD_CLASS_BASELINE = ${DEAD_CLASS_BASELINE}, 实测 = ${deadTotal}`);
}

if (problems.length) {
    console.error(problems.map((p) => `✖ ${p}`).join('\n\n'));
    process.exitCode = 1;
} else {
    console.log(`[style-ownership] 分层归属通过；未引用类名 ${deadTotal}/${DEAD_CLASS_BASELINE} 在棘轮内。`);
    if (deadTotal < DEAD_CLASS_BASELINE) {
        console.warn(`[style-ownership] 死类已降至 ${deadTotal}，请把 DEAD_CLASS_BASELINE 下调到 ${deadTotal}。`);
    }
    if (staleLegacy.length) {
        console.warn(`[style-ownership] 以下 LEGACY_CROSS_LAYER 登记项已不再违规，请移除：${staleLegacy.join(', ')}`);
    }
}
