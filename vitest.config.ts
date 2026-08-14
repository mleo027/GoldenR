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
        include: ['src/**/*.test.{ts,tsx}', 'electron/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json-summary', 'html'],
            include: [
                'src/shared/**/*.{ts,tsx}',
                'src/modules/api-debug/services/**/*.{ts,tsx}',
                'src/modules/api-debug/store/**/*.{ts,tsx}',
                'electron/ipc/**/*.ts',
                'electron/services/**/*.ts',
            ],
            exclude: ['**/*.test.{ts,tsx}', '**/node_modules/**'],
        },
    },
});
