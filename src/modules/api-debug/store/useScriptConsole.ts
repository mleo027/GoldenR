import { useScriptConsoleStore } from './scriptConsoleStore';
import { useShallow } from 'zustand/react/shallow';

export function useScriptConsoleState() {
    return useScriptConsoleStore(useShallow(({ consoles }) => ({ consoles })));
}

export function useScriptConsoleActions() {
    return useScriptConsoleStore(
        useShallow(({ setScriptConsole, clearScriptConsole }) => ({
            setScriptConsole,
            clearScriptConsole,
        })),
    );
}

export function useScriptConsole(caseId: string) {
    return useScriptConsoleStore((state) => state.consoles[caseId]);
}
