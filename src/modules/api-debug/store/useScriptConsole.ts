import { useContext, useMemo } from 'react';
import { ScriptConsoleActionsContext, ScriptConsoleStateContext } from './ScriptConsoleContext';

export function useScriptConsoleState() {
    const context = useContext(ScriptConsoleStateContext);
    if (!context) {
        throw new Error('useScriptConsoleState must be used within ScriptConsoleProvider');
    }
    return context;
}

export function useScriptConsoleActions() {
    const context = useContext(ScriptConsoleActionsContext);
    if (!context) {
        throw new Error('useScriptConsoleActions must be used within ScriptConsoleProvider');
    }
    return context;
}

export function useScriptConsole(caseId: string) {
    const { consoles } = useScriptConsoleState();
    return useMemo(() => consoles[caseId], [consoles, caseId]);
}
