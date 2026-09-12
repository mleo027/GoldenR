import { create } from 'zustand';
import type { ResponseData } from '../types/workspace';

const MAX_CACHED_RESPONSES = 20;

interface ResponseStoreState {
    responses: Record<string, ResponseData>;
    order: string[];
    setResponse: (caseId: string, response: ResponseData) => void;
    clearResponse: (caseId: string) => void;
}

export const useResponseStore = create<ResponseStoreState>((set) => ({
    responses: {},
    order: [],
    setResponse: (caseId, response) =>
        set((state) => {
            const order = [...state.order.filter((id) => id !== caseId), caseId];
            const responses = { ...state.responses, [caseId]: response };
            const overflow = order.length - MAX_CACHED_RESPONSES;
            if (overflow <= 0) return { responses, order };
            const nextResponses = { ...responses };
            for (const id of order.slice(0, overflow)) delete nextResponses[id];
            return { responses: nextResponses, order: order.slice(overflow) };
        }),
    clearResponse: (caseId) =>
        set((state) => {
            if (!state.responses[caseId]) return state;
            const responses = { ...state.responses };
            delete responses[caseId];
            return { responses, order: state.order.filter((id) => id !== caseId) };
        }),
}));
