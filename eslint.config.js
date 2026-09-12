import js from '@eslint/js';
import globals from 'globals';
import boundaries from 'eslint-plugin-boundaries';
import { recommended as boundariesRecommended } from 'eslint-plugin-boundaries/config';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import react from 'eslint-plugin-react';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import tseslint from 'typescript-eslint';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const reactRules = {
    ...reactHooks.configs.recommended.rules,
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
};

/* -------------------------------------------------------------------------- */
/* 架构分层（boundaries）                                                      */
/* -------------------------------------------------------------------------- */

/** 元素选择器：匹配任意给定 type（数组为「任一命中」）。 */
const el = (...types) => ({ element: { type: types } });

const MOD = 'src/modules/api-debug';

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

/** 全局层元素。src/config 是 src/shared 的再导出壳，合并为 shared。 */
const globalElements = [
    { type: 'shell', pattern: 'src/platform/shell', partialMatch: false, exclusive: true },
    { type: 'undo', pattern: 'src/platform/undo', partialMatch: false, exclusive: true },
    { type: 'registry', pattern: 'src/platform/registry', partialMatch: false, exclusive: true },
    { type: 'ui', pattern: 'src/components', partialMatch: false, exclusive: true },
    { type: 'runtime', pattern: 'src/runtime', partialMatch: false, exclusive: true },
    { type: 'services', pattern: 'src/services', partialMatch: false, exclusive: true },
    { type: 'store', pattern: 'src/store', partialMatch: false, exclusive: true },
    { type: 'hooks', pattern: 'src/hooks', partialMatch: false, exclusive: true },
    { type: 'util', pattern: 'src/utils', partialMatch: false, exclusive: true },
    { type: 'types', pattern: 'src/types', partialMatch: false, exclusive: true },
    { type: 'constants', pattern: 'src/constants', partialMatch: false, exclusive: true },
    { type: 'lib', pattern: 'src/lib', partialMatch: false, exclusive: true },
    { type: 'shared', pattern: ['src/shared', 'src/config'], partialMatch: false, exclusive: true },
    { type: 'electron', pattern: 'electron', partialMatch: false, exclusive: true },
];

/**
 * 依赖白名单：default 为 disallow，只有下列策略允许的方向才合法。
 * 目标为外部包（react/antd/...）时默认跳过，不受此表约束。
 */
const dependencyPolicies = [
    // 组合根：可依赖任意层
    { from: el('registry'), allow: { to: el('*') } },

    // shared 叶子层；src/config 合并于此，故可再导出 registry / 模块常量
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
                'hooks',
                'util',
                'constants',
                'types',
                'lib',
                'shared',
            ),
        },
    },
    {
        from: el('undo'),
        allow: { to: el('undo', 'shell', 'util', 'constants', 'types', 'lib', 'shared') },
    },

    // 共享 UI / 全局 hooks
    {
        from: el('ui'),
        allow: {
            to: el(
                'ui',
                'store',
                'hooks',
                'services',
                'registry',
                'shell',
                'util',
                'constants',
                'types',
                'lib',
                'shared',
            ),
        },
    },
    {
        from: el('hooks'),
        allow: { to: el('hooks', 'store', 'util', 'constants', 'types', 'lib', 'shared') },
    },

    // 全局基础设施
    {
        from: el('store'),
        allow: {
            to: el('store', 'services', 'registry', 'util', 'constants', 'types', 'lib', 'shared'),
        },
    },
    { from: el('runtime'), allow: { to: el('lib', 'types', 'shared') } },
    {
        from: el('services'),
        allow: { to: el('services', 'runtime', 'util', 'constants', 'types', 'lib', 'shared') },
    },
    { from: el('lib'), allow: { to: el('lib', 'registry', 'store', 'types', 'shared') } },
    { from: el('util'), allow: { to: el('util', 'constants', 'types', 'lib', 'shared') } },
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
                'hooks',
                'util',
                'constants',
                'types',
                'lib',
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
                'lib',
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
                'hooks',
                'store',
                'ui',
                'runtime',
                'util',
                'constants',
                'types',
                'lib',
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
                'hooks',
                'shell',
                'ui',
                'runtime',
                'store',
                'util',
                'constants',
                'types',
                'lib',
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
                'lib',
                'shared',
            ),
        },
    },
    {
        from: el('mod-service'),
        allow: {
            to: el(
                'mod-service',
                'mod-util',
                'mod-types',
                'mod-const',
                'runtime',
                'util',
                'constants',
                'types',
                'lib',
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
                'lib',
                'shared',
            ),
        },
    },
    {
        from: el('mod-types', 'mod-const'),
        allow: { to: el('mod-types', 'mod-const', 'mod-util', 'shared', 'types', 'constants') },
    },
];

const boundariesConfig = {
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
        'boundaries/elements': [...moduleElements, ...globalElements],
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

/* -------------------------------------------------------------------------- */
/* 业务约束（no-restricted-imports）                                            */
/*                                                                             */
/* 注意：flat config 中多个块设置同一规则会相互覆盖，因此这里按「导入方文件」   */
/* 切成互斥分区，每个文件只会命中其中一个 no-restricted-imports 配置块。        */
/* -------------------------------------------------------------------------- */

/** 基础表单控件复用约束。 */
const primitiveOnly = {
    name: 'antd',
    importNames: ['Input', 'Select', 'TextArea', 'Password'],
    message: '请使用 @/components/ui/primitives 的同名组件，以统一交互与样式',
};

/** 配置读写收口到 *Data 持久化层。 */
const configStorageOnlyInData = {
    group: ['**/persistence/configStorage'],
    message: '配置读写请通过 *Data.ts 持久化层，不要在业务代码直连 configStorage',
};

/** KCBP 调用细节收口到 service 层。 */
const kcbpOnlyInServices = {
    group: ['**/kcbp/electronClient', '**/call/executors/**'],
    message: 'KCBP 调用细节属于 service 层，请通过 service 暴露的入口调用',
};

/** 组件只能通过 use* hook / *Context 访问工作区状态。 */
const storeAccessViaHooks = {
    group: ['**/store/tabsZustand', '**/store/*Store', '**/store/*Data', '**/store/tabsReducer/**'],
    message: '组件只能通过 store/use* hook 或 *Context 读取状态，不要直连 store 实现',
};

export default tseslint.config(
    { ignores: ['dist', 'dist-electron', 'node_modules', 'coverage'] },
    {
        files: ['**/*.{ts,tsx}'],
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        languageOptions: {
            globals: globals.browser,
            parserOptions: {
                projectService: true,
                tsconfigRootDir: rootDir,
            },
        },
        plugins: {
            '@typescript-eslint': tseslint.plugin,
            react,
            'jsx-a11y': jsxA11y,
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
        rules: {
            ...reactRules,
            'react/jsx-key': 'error',
            'react/button-has-type': 'error',
            'react/no-unknown-property': 'error',
            'jsx-a11y/alt-text': 'error',
            'jsx-a11y/label-has-associated-control': 'error',
            'jsx-a11y/anchor-is-valid': 'error',
            // Keep the baseline strict and consistent across renderer and main
            // process code. These rules are intentionally autofix-safe.
            'no-var': 'error',
            'prefer-const': ['error', { destructuring: 'all' }],
            'no-throw-literal': 'error',
            'no-debugger': 'error',
            'no-eval': 'error',
            'no-unsafe-optional-chaining': 'error',
            'no-promise-executor-return': 'error',
            '@typescript-eslint/no-floating-promises': [
                'error',
                { ignoreVoid: true, ignoreIIFE: false, allowForKnownSafeCalls: [] },
            ],
            // 类型控制：类型导入必须显式声明，降低运行时耦合
            '@typescript-eslint/consistent-type-imports': [
                'error',
                {
                    prefer: 'type-imports',
                    fixStyle: 'inline-type-imports',
                    disallowTypeAnnotations: false,
                },
            ],
        },
    },

    boundariesConfig,

    // 分区 1：持久化层 —— 允许 configStorage，仅禁止直连 KCBP 客户端
    {
        files: [
            'src/modules/api-debug/store/**/*Data.ts',
            'src/store/**/*Data.ts',
            'src/services/persistence/**/*.{ts,tsx}',
        ],
        rules: {
            'no-restricted-imports': [
                'error',
                { paths: [primitiveOnly], patterns: [kcbpOnlyInServices] },
            ],
        },
    },

    // 分区 2：api-debug services —— 禁止 antd 与 configStorage，允许 KCBP 客户端
    {
        files: ['src/modules/api-debug/services/**/*.{ts,tsx}'],
        rules: {
            'no-restricted-imports': [
                'error',
                { paths: ['antd', primitiveOnly], patterns: [configStorageOnlyInData] },
            ],
        },
    },

    // 分区 3：api-debug store（非 *Data）—— 禁止全部 antd 与配置/KCBP 直连
    {
        files: ['src/modules/api-debug/store/**/*.{ts,tsx}'],
        ignores: ['**/*Data.ts'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    paths: ['antd'],
                    patterns: [configStorageOnlyInData, kcbpOnlyInServices],
                },
            ],
        },
    },

    // 分区 4：组件 —— 基础控件复用 + 状态经 hook + 禁止配置/KCBP 直连
    {
        files: ['src/modules/api-debug/components/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
        ignores: ['src/components/ui/primitives/**'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    paths: [primitiveOnly],
                    patterns: [storeAccessViaHooks, configStorageOnlyInData, kcbpOnlyInServices],
                },
            ],
        },
    },

    // 分区 5：其余 src 文件 —— 禁止配置/KCBP 直连
    {
        files: ['src/**/*.{ts,tsx}'],
        ignores: [
            'src/components/ui/primitives/**',
            'src/components/**',
            'src/modules/api-debug/services/**',
            'src/modules/api-debug/store/**',
            'src/modules/api-debug/components/**',
            '**/*Data.ts',
            'src/services/persistence/**',
        ],
        rules: {
            'no-restricted-imports': [
                'error',
                { paths: [primitiveOnly], patterns: [configStorageOnlyInData, kcbpOnlyInServices] },
            ],
        },
    },

    {
        files: ['src/**/*.{ts,tsx}'],
        ignores: ['src/lib/electron.ts'],
        rules: {
            'no-restricted-syntax': [
                'error',
                {
                    selector: 'MemberExpression[object.name="window"][property.name="electronAPI"]',
                    message: 'Use getElectronAPI/requireElectronAPI instead of window.electronAPI',
                },
            ],
        },
    },

    {
        // 渲染进程禁止 Node 全局量，须经 runtime facade / lib 封装
        files: ['src/**/*.{ts,tsx}'],
        ignores: ['**/*.test.*'],
        rules: {
            'no-restricted-globals': [
                'error',
                { name: 'process', message: 'Renderer 不得直接使用 process，请走 runtime facade' },
                { name: 'Buffer', message: 'Renderer 不得直接使用 Buffer' },
                { name: 'require', message: 'Renderer 使用 ESM import' },
                { name: '__dirname', message: 'Node 路径 API 仅限 electron/ 与 scripts/' },
            ],
        },
    },

    {
        files: ['electron/**/*.ts', 'vite.config.ts'],
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        languageOptions: {
            globals: globals.node,
            parserOptions: {
                projectService: true,
                tsconfigRootDir: rootDir,
            },
        },
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: [
                                '@/modules/**',
                                '@/components/**',
                                '@/store/**',
                                '@/platform/**',
                                '@/runtime/**',
                                '@/services/**',
                                '@/hooks/**',
                                '@/lib/**',
                            ],
                            message:
                                'electron 不得依赖 renderer 的业务、UI、store、platform、runtime、services、lib 或 hooks',
                        },
                    ],
                },
            ],
        },
    },

    {
        files: ['scripts/**/*.{js,mjs,cjs}', '*.config.{js,mjs,cjs}'],
        extends: [js.configs.recommended],
        languageOptions: {
            ecmaVersion: 2022,
            globals: globals.node,
            sourceType: 'module',
        },
    },
);
