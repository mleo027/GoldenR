import { useContext } from 'react';
import { PlatformShellContext } from './PlatformShellContext';

export function usePlatformShell() {
    const ctx = useContext(PlatformShellContext);
    if (!ctx) {
        throw new Error('usePlatformShell must be used within PlatformShell');
    }
    return ctx;
}
