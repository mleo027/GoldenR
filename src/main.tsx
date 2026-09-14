import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { setupPersistFlushListener } from './platform/lifecycle/persistFlush';
import { preloadKcbpRuntimeConfig } from './platform/bridge/kcbpRuntimeConfigClient';
import { preloadAppEnv } from './store/appEnvData';
import { getElectronAPI } from './platform/bridge/electron';

setupPersistFlushListener();

if (getElectronAPI()) {
    void preloadAppEnv().catch(console.error);
    void preloadKcbpRuntimeConfig().catch(console.error);
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
