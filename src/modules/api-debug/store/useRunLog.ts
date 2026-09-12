import { useRunLogStore } from './runLogStore';
import { useShallow } from 'zustand/react/shallow';

export function useRunLogState() {
    return useRunLogStore(useShallow(({ logs }) => ({ logs })));
}

export function useRunLogActions() {
    return useRunLogStore(useShallow(({ pushLog, clearLogs }) => ({ pushLog, clearLogs })));
}

/** @deprecated 优先使用 useRunLogState / useRunLogActions */
export function useRunLog() {
    return { ...useRunLogState(), ...useRunLogActions() };
}
