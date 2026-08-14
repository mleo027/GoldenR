import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const reactRules = {
    ...reactHooks.configs.recommended.rules,
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
};

export default tseslint.config(
    { ignores: ['dist', 'dist-electron', 'node_modules'] },
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
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
        },
        rules: reactRules,
    },
    {
        files: ['src/shared/**/*.{ts,tsx}'],
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
                                '@/config/**',
                            ],
                            message:
                                'shared must not import feature, UI, store, platform, or config layers',
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ['src/modules/api-debug/services/**/*.{ts,tsx}'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    paths: ['antd'],
                    patterns: [
                        {
                            group: [
                                '@/components/**',
                                '@/modules/**/components/**',
                                '@/modules/**/layout/**',
                                '@/modules/**/providers/**',
                                '@/modules/**/store/**',
                            ],
                            message: 'api-debug services must not import UI or store layers',
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ['src/modules/api-debug/store/**/*.{ts,tsx}'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    paths: ['antd'],
                    patterns: [
                        {
                            group: [
                                '@/components/**',
                                '@/modules/**/components/**',
                                '@/modules/**/layout/**',
                            ],
                            message: 'api-debug store must not import UI layers or antd',
                        },
                    ],
                },
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
                            ],
                            message:
                                'electron must not import renderer feature, UI, store, or platform layers',
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
