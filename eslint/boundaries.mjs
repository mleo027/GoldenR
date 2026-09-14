/**
 * 架构分层（boundaries）配置。
 *
 * 从 `eslint.config.js` 抽出来单独维护：完整的分层规则本身就有几百行，混在主编排文件里
 * 会让两者都难读，也会顶到 `max-lines` 上限。这里是唯一需要改分层的地方。
 *
 * 三组元素：
 * - `moduleElements`      api-debug 模块内部（`mod-*`）
 * - `automationElements`  interface-automation 模块内部（`ia-*`）
 * - `globalElements`      平台与全局层
 *
 * 策略表 `dependencyPolicies` 是 default-deny 白名单：只有显式列出的方向合法。
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import boundaries from 'eslint-plugin-boundaries';
import { recommended as boundariesRecommended } from 'eslint-plugin-boundaries/config';

// 本文件在 `eslint/` 子目录下，仓库根目录是其上一级。
const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/** 元素选择器：匹配任意给定 type（数组为「任一命中」）。 */
const el = (...types) => ({ element: { type: types } });

const MOD = 'src/modules/api-debug';
const IA = 'src/modules/interface-automation';

/**
 * api-debug 模块内部的细分元素。
 * partialMatch:false + 完整路径，避免 `components/*` 同时命中 src/components。
 * 不定义 `src/modules` 兜底类型，防止父元素类型污染子元素的分层规则。
 */
const moduleElements = [
    { type: 'mod-store', pattern: `${MOD}/store`, partialMatch: false, exclusive: true },
    { type: 'mod-service', pattern: `${MOD}/services`, partialMatch: false, exclusive: true },
    { type: 'mod-ui', pattern: `${MOD}/components`, partialMatch: false, exclusive: true },
    { type: 'mod-layout', pattern: `${MOD}/layout`, partialMatch: false, exclusive: true },
    { type: 'mod-providers', pattern: `${MOD}/providers`, partialMatch: false, exclusive: true },
    { type: 'mod-hook', pattern: `${MOD}/hooks`, partialMatch: false, exclusive: true },
    { type: 'mod-util', pattern: `${MOD}/utils`, partialMatch: false, exclusive: true },
    { type: 'mod-types', pattern: `${MOD}/types`, partialMatch: false, exclusive: true },
    { type: 'mod-const', pattern: `${MOD}/constants`, partialMatch: false, exclusive: true },
];

/**
 * interface-automation 模块内部的细分元素，形状与 api-debug 一致。
 *
 * 元素按**目录**匹配：插件不支持用元素描述单个文件（`partialMatch: false` 下 `mode`
 * 无效，文件级归类要走 `boundaries/files` 那套）。模块根目录下的散装文件因此天然
 * 落在元素模型之外——IA 已无此类文件（根级 `constants.ts` 收进了 `constants/`），
 * 否则 `store → ../constants` 这条真实依赖会被静默放过。
 * api-debug 的 `types.ts` / `persist.ts` / `index.tsx` 是既有例外。
 */
const automationElements = [
    { type: 'ia-store', pattern: `${IA}/store`, partialMatch: false, exclusive: true },
    { type: 'ia-service', pattern: `${IA}/services`, partialMatch: false, exclusive: true },
    { type: 'ia-ui', pattern: `${IA}/components`, partialMatch: false, exclusive: true },
    { type: 'ia-layout', pattern: `${IA}/layout`, partialMatch: false, exclusive: true },
    { type: 'ia-providers', pattern: `${IA}/providers`, partialMatch: false, exclusive: true },
    { type: 'ia-hook', pattern: `${IA}/hooks`, partialMatch: false, exclusive: true },
    { type: 'ia-util', pattern: `${IA}/utils`, partialMatch: false, exclusive: true },
    { type: 'ia-const', pattern: `${IA}/constants`, partialMatch: false, exclusive: true },
    { type: 'ia-worker', pattern: `${IA}/worker`, partialMatch: false, exclusive: true },
];

/** 全局层元素。 */
const globalElements = [
    { type: 'shell', pattern: 'src/platform/shell', partialMatch: false, exclusive: true },
    { type: 'undo', pattern: 'src/platform/undo', partialMatch: false, exclusive: true },
    { type: 'registry', pattern: 'src/platform/registry', partialMatch: false, exclusive: true },
    { type: 'ui', pattern: 'src/components', partialMatch: false, exclusive: true },
    { type: 'runtime', pattern: 'src/runtime', partialMatch: false, exclusive: true },
    { type: 'services', pattern: 'src/services', partialMatch: false, exclusive: true },
    { type: 'store', pattern: 'src/store', partialMatch: false, exclusive: true },
    { type: 'platform-hooks', pattern: 'src/platform/hooks', partialMatch: false, exclusive: true },
    { type: 'util', pattern: 'src/utils', partialMatch: false, exclusive: true },
    { type: 'types', pattern: 'src/types', partialMatch: false, exclusive: true },
    { type: 'constants', pattern: 'src/constants', partialMatch: false, exclusive: true },
    { type: 'bridge', pattern: 'src/platform/bridge', partialMatch: false, exclusive: true },
    { type: 'lifecycle', pattern: 'src/platform/lifecycle', partialMatch: false, exclusive: true },
    { type: 'shared', pattern: 'src/shared', partialMatch: false, exclusive: true },
    { type: 'electron', pattern: 'electron', partialMatch: false, exclusive: true },
];

/**
 * 依赖白名单：default 为 disallow，只有下列策略允许的方向才合法。
 * 目标为外部包（react/antd/...）时默认跳过，不受此表约束。
 */
const dependencyPolicies = [
    // 组合根：可依赖任意层
    { from: el('registry'), allow: { to: el('*') } },

    // shared 叶子层
    {
        from: el('shared'),
        allow: { to: el('shared', 'types', 'constants', 'registry', 'mod-types', 'mod-const') },
    },

    // 平台壳
    {
        from: el('shell'),
        allow: {
            to: el(
                'shell',
                'undo',
                'registry',
                'ui',
                'store',
                'platform-hooks',
                'util',
                'constants',
                'types',
                'bridge',
                'lifecycle',
                'shared',
            ),
        },
    },
    {
        from: el('undo'),
        allow: {
            to: el('undo', 'shell', 'util', 'constants', 'types', 'bridge', 'lifecycle', 'shared'),
        },
    },

    // 共享 UI / 平台 hooks
    {
        from: el('ui'),
        allow: {
            to: el(
                'ui',
                'store',
                'platform-hooks',
                'services',
                'registry',
                'shell',
                'util',
                'constants',
                'types',
                'bridge',
                'lifecycle',
                'shared',
            ),
        },
    },
    {
        from: el('platform-hooks'),
        allow: {
            to: el(
                'platform-hooks',
                'util',
                'constants',
                'types',
                'shared',
            ),
        },
    },

    // 全局基础设施
    {
        from: el('store'),
        allow: {
            to: el(
                'store',
                'services',
                'registry',
                'util',
                'constants',
                'types',
                'bridge',
                'lifecycle',
                'shared',
            ),
        },
    },
    { from: el('runtime'), allow: { to: el('bridge', 'lifecycle', 'types', 'shared') } },
    {
        from: el('services'),
        allow: {
            to: el(
                'services',
                'runtime',
                'registry',
                'util',
                'constants',
                'types',
                'bridge',
                'lifecycle',
                'shared',
            ),
        },
    },
    { from: el('bridge'), allow: { to: el('bridge', 'types', 'shared') } },
    {
        from: el('lifecycle'),
        allow: { to: el('lifecycle', 'bridge', 'registry', 'store', 'types', 'shared') },
    },
    {
        from: el('util'),
        allow: { to: el('util', 'constants', 'types', 'bridge', 'lifecycle', 'shared') },
    },
    { from: el('types', 'constants'), allow: { to: el('types', 'constants', 'shared') } },
    { from: el('electron'), allow: { to: el('electron', 'shared', 'types', 'constants') } },

    // api-debug 模块内部
    {
        from: el('mod-providers'),
        allow: {
            to: el(
                'mod-store',
                'mod-service',
                'mod-ui',
                'mod-layout',
                'mod-hook',
                'mod-util',
                'mod-types',
                'mod-const',
                'ui',
                'runtime',
                'services',
                'store',
                'platform-hooks',
                'util',
                'constants',
                'types',
                'bridge',
                'lifecycle',
                'shared',
            ),
        },
    },
    {
        from: el('mod-layout'),
        allow: {
            to: el(
                'mod-ui',
                'mod-hook',
                'mod-store',
                'mod-util',
                'mod-types',
                'mod-const',
                'shell',
                'ui',
                'runtime',
                'util',
                'constants',
                'types',
                'bridge',
                'lifecycle',
                'shared',
            ),
        },
    },
    {
        from: el('mod-ui'),
        allow: {
            to: el(
                'mod-ui',
                'mod-hook',
                'mod-store',
                'mod-service',
                'mod-util',
                'mod-types',
                'mod-const',
                'undo',
                'shell',
                'platform-hooks',
                'store',
                'ui',
                'runtime',
                'util',
                'constants',
                'types',
                'bridge',
                'lifecycle',
                'shared',
            ),
        },
    },
    {
        from: el('mod-hook'),
        allow: {
            to: el(
                'mod-store',
                'mod-service',
                'mod-ui',
                'mod-util',
                'mod-types',
                'mod-const',
                'platform-hooks',
                'shell',
                'ui',
                'runtime',
                'store',
                'util',
                'constants',
                'types',
                'bridge',
                'lifecycle',
                'shared',
            ),
        },
    },
    {
        from: el('mod-store'),
        allow: {
            to: el(
                'mod-store',
                'mod-service',
                'mod-util',
                'mod-types',
                'mod-const',
                'undo',
                'store',
                'services',
                'runtime',
                'util',
                'constants',
                'types',
                'bridge',
                'lifecycle',
                'shared',
            ),
        },
    },
    {
        from: el('mod-service'),
        allow: {
            to: el(
                'mod-store',
                'mod-service',
                'mod-util',
                'mod-types',
                'mod-const',
                'undo',
                'store',
                'services',
                'runtime',
                'util',
                'constants',
                'types',
                'bridge',
                'lifecycle',
                'shared',
            ),
        },
    },
    {
        from: el('mod-util'),
        allow: {
            to: el(
                'mod-util',
                'mod-types',
                'mod-const',
                'util',
                'constants',
                'types',
                'bridge',
                'lifecycle',
                'shared',
            ),
        },
    },
    {
        from: el('mod-types', 'mod-const'),
        allow: { to: el('mod-types', 'mod-const', 'mod-util', 'shared', 'types', 'constants') },
    },

    // interface-automation 模块内部（形状对齐 api-debug）
    {
        from: el('ia-providers'),
        allow: {
            to: el(
                'ia-store',
                'ia-service',
                'ia-ui',
                'ia-layout',
                'ia-hook',
                'ia-util',
                'ia-const',
                'ia-worker',
                'ui',
                'runtime',
                'services',
                'store',
                'platform-hooks',
                'util',
                'constants',
                'types',
                'bridge',
                'lifecycle',
                'shared',
            ),
        },
    },
    {
        from: el('ia-layout'),
        allow: {
            to: el(
                'ia-ui',
                'ia-hook',
                'ia-store',
                'ia-util',
                'ia-const',
                'shell',
                'registry',
                'ui',
                'runtime',
                'util',
                'constants',
                'types',
                'bridge',
                'lifecycle',
                'shared',
            ),
        },
    },
    {
        from: el('ia-ui'),
        allow: {
            to: el(
                'ia-ui',
                'ia-hook',
                'ia-store',
                'ia-service',
                'ia-util',
                'ia-const',
                'undo',
                'shell',
                'platform-hooks',
                'store',
                'ui',
                'runtime',
                'util',
                'constants',
                'types',
                'bridge',
                'lifecycle',
                'shared',
            ),
        },
    },
    {
        from: el('ia-hook'),
        allow: {
            to: el(
                'ia-store',
                'ia-service',
                'ia-util',
                'ia-const',
                'platform-hooks',
                'store',
                'ui',
                'runtime',
                'util',
                'constants',
                'types',
                'bridge',
                'lifecycle',
                'shared',
            ),
        },
    },
    {
        from: el('ia-store'),
        allow: {
            to: el(
                'ia-store',
                'ia-service',
                'ia-util',
                'ia-const',
                'store',
                'services',
                'runtime',
                'util',
                'constants',
                'types',
                'bridge',
                'lifecycle',
                'shared',
            ),
        },
    },
    {
        from: el('ia-service'),
        allow: {
            to: el(
                'ia-store',
                'ia-service',
                'ia-util',
                'ia-const',
                'ia-worker',
                'store',
                'services',
                'runtime',
                'util',
                'constants',
                'types',
                'bridge',
                'lifecycle',
                'shared',
            ),
        },
    },
    {
        from: el('ia-util'),
        allow: {
            to: el(
                'ia-util',
                'ia-const',
                'util',
                'constants',
                'types',
                'bridge',
                'lifecycle',
                'shared',
            ),
        },
    },
    {
        from: el('ia-worker'),
        allow: { to: el('ia-worker', 'constants', 'types', 'bridge', 'lifecycle', 'shared') },
    },
    { from: el('ia-const'), allow: { to: el('ia-const', 'constants', 'types', 'shared') } },
];

/** 供 `eslint.config.js` 直接展开的 flat-config 片段。 */
export const boundariesConfig = {
    files: ['src/**/*.{ts,tsx}', 'electron/**/*.ts'],
    plugins: { boundaries },
    settings: {
        ...boundariesRecommended.settings,
        'boundaries/root-path': rootDir,
        'boundaries/include': ['src/**/*', 'electron/**/*'],
        'boundaries/ignore': ['**/*.test.*', '**/*.d.ts'],
        'boundaries/dependency-nodes': ['import', 'dynamic-import', 'export'],
        // 解析 @/ 别名，使相对路径与别名路径都按真实文件归类
        'import/resolver': {
            typescript: {
                project: [
                    path.resolve(rootDir, 'tsconfig.app.json'),
                    path.resolve(rootDir, 'tsconfig.electron.json'),
                ],
            },
        },
        'boundaries/elements': [...moduleElements, ...automationElements, ...globalElements],
    },
    rules: {
        ...boundariesRecommended.rules,
        'boundaries/dependencies': [
            'error',
            {
                default: 'disallow',
                policies: dependencyPolicies,
            },
        ],
    },
};
