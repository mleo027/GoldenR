import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { setupPersistFlushListener } from './lib/persistFlush';
import { preloadKcbpRuntimeConfig } from './lib/kcbpRuntimeConfigClient';
import { preloadAppEnv } from './store/appEnvData';
import { getElectronAPI } from './lib/electron';
import { startCapabilityHost } from './platform/capabilities/hostBridge';

setupPersistFlushListener();

if (getElectronAPI()) {
    // 能力宿主：让外部调用方（MCP 等）能在本进程中执行能力。
    startCapabilityHost();
    void preloadAppEnv().catch(console.error);
    void preloadKcbpRuntimeConfig().catch(console.error);
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
