import { useContext } from 'react';
import { RunLogActionsContext, RunLogStateContext } from './RunLogContext';

export function useRunLogState() {
    const context = useContext(RunLogStateContext);
    if (!context) {
        throw new Error('useRunLogState must be used within RunLogProvider');
    }
    return context;
}

export function useRunLogActions() {
    const context = useContext(RunLogActionsContext);
    if (!context) {
        throw new Error('useRunLogActions must be used within RunLogProvider');
    }
    return context;
}

/** @deprecated 优先使用 useRunLogState / useRunLogActions */
export function useRunLog() {
    return { ...useRunLogState(), ...useRunLogActions() };
}
