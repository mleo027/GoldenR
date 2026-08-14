import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { setupPersistFlushListener } from './lib/persistFlush';
import { preloadKcbpRuntimeConfig } from './lib/kcbpRuntimeConfigClient';
import { preloadAppEnv } from './store/appEnvData';

setupPersistFlushListener();

if (window.electronAPI) {
    preloadAppEnv();
    preloadKcbpRuntimeConfig();
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
