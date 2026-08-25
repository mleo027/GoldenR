import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import path from 'path';
import { execSync } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { copyFileSync, mkdirSync } from 'fs';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';

const analyzeBundle = process.env.ANALYZE === '1';

type ElectronProcess = NodeJS.Process & { electronApp?: ChildProcess };

async function startElectronApp(startup: () => Promise<void>) {
    const proc = process as ElectronProcess;
    const child = proc.electronApp;

    if (child?.pid) {
        try {
            execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' });
        } catch {
            // Old process may already be gone.
        }
        child.removeAllListeners();
        proc.electronApp = undefined;
    }

    await startup();
}

function electronMainOnstart(args: { startup: () => Promise<void> }) {
    void startElectronApp(args.startup);
}

function electronPreloadOnstart(args: { startup: () => Promise<void>; reload: () => void }) {
    void startElectronApp(args.startup);
}

function copyKcbpBridgePlugin(): Plugin {
    const files = [
        { src: path.resolve(__dirname, 'electron/kcbpBridge.cjs'), name: 'kcbpBridge.cjs' },
    ];
    const destDir = path.resolve(__dirname, 'dist-electron');

    const copy = () => {
        mkdirSync(destDir, { recursive: true });
        for (const file of files) {
            copyFileSync(file.src, path.join(destDir, file.name));
        }
    };

    return {
        name: 'copy-kcbp-bridge',
        buildStart: copy,
        configureServer() {
            copy();
        },
    };
}

export default defineConfig({
    base: './',
    plugins: [
        tailwindcss(),
        react(),
        copyKcbpBridgePlugin(),
        electron([
            {
                entry: 'electron/main.ts',
                onstart: electronMainOnstart,
                vite: {
                    resolve: {
                        alias: {
                            '@': path.resolve(__dirname, './src'),
                        },
                    },
                    build: {
                        rollupOptions: {
                            output: {
                                format: 'es',
                                inlineDynamicImports: true,
                                entryFileNames: 'main.js',
                            },
                        },
                    },
                },
            },
            {
                entry: 'electron/preload.ts',
                onstart: electronPreloadOnstart,
                vite: {
                    resolve: {
                        alias: {
                            '@': path.resolve(__dirname, './src'),
                        },
                    },
                    build: {
                        lib: false,
                        rollupOptions: {
                            input: 'electron/preload.ts',
                            external: ['electron'],
                            output: {
                                format: 'cjs',
                                entryFileNames: 'preload.cjs',
                            },
                        },
                    },
                },
            },
        ]),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        rollupOptions: {
            plugins: analyzeBundle
                ? [
                      visualizer({
                          filename: path.resolve(__dirname, 'dist/stats.json'),
                          template: 'raw-data',
                          gzipSize: true,
                          open: false,
                      }),
                  ]
                : [],
            output: {
                manualChunks: {
                    'vendor-react': ['react', 'react-dom'],
                    'vendor-antd': ['antd'],
                    'vendor-icons': ['@ant-design/icons'],
                    'vendor-panels': ['react-resizable-panels'],
                },
            },
        },
    },
    server: {
        watch: {
            ignored: [
                '**/app.json',
                '**/settings.json',
                '**/project.json',
                '**/db.json',
                '**/param-suggest-rules.json',
                '**/api-debug.env.json',
            ],
        },
    },
});
