import { useResponseStore } from './responseStore';
import { useShallow } from 'zustand/react/shallow';

export function useResponseState() {
    return useResponseStore(useShallow(({ responses }) => ({ responses })));
}

export function useResponseActions() {
    return useResponseStore(
        useShallow(({ setResponse, clearResponse }) => ({ setResponse, clearResponse })),
    );
}

export function useResponse(caseId: string) {
    return useResponseStore((state) => state.responses[caseId]);
}
