import js from '@eslint/js';
import { boundariesConfig } from './eslint/boundaries.mjs';
import globals from 'globals';
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
        ignores: ['src/platform/bridge/electron.ts'],
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
        // 渲染进程禁止 Node 全局量，须经 runtime facade / platform bridge 封装
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
                            ],
                            message:
                                'electron 不得依赖 renderer 的业务、UI、store、platform、runtime 或 services',
                        },
                    ],
                },
            ],
        },
    },

    {
        files: ['scripts/**/*.{js,mjs,cjs}', '*.config.{js,mjs,cjs}', 'eslint/**/*.mjs'],
        extends: [js.configs.recommended],
        languageOptions: {
            ecmaVersion: 2022,
            globals: globals.node,
            sourceType: 'module',
        },
    },
);
