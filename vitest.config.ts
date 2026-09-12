import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    test: {
        environment: 'node',
        // 组件测试在 jsdom + coverage 插桩下明显变慢，5s 默认值会误报超时。
        testTimeout: 20000,
        include: ['src/**/*.test.{ts,tsx}', 'electron/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json-summary', 'html'],
            include: [
                'src/shared/**/*.{ts,tsx}',
                'src/modules/api-debug/components/**/*.{ts,tsx}',
                'src/modules/api-debug/services/**/*.{ts,tsx}',
                'src/modules/api-debug/store/**/*.{ts,tsx}',
                'electron/ipc/**/*.ts',
                'electron/services/**/*.ts',
            ],
            exclude: ['**/*.test.{ts,tsx}', '**/node_modules/**'],
            // 棘轮：略低于当前实测值（lines 60.5 / stmts 59.3 / fns 59.2 / branch 52.7）。
            // 只允许上调，不允许回退。
            thresholds: {
                lines: 60,
                statements: 59,
                functions: 59,
                branches: 52,
            },
        },
    },
});
