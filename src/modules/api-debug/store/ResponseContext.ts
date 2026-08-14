import { createContext } from 'react';
import type { ResponseData } from '../types/workspace';

export interface ResponseStateContextValue {
    responses: Record<string, ResponseData>;
}

export interface ResponseActionsContextValue {
    setResponse: (caseId: string, response: ResponseData) => void;
    clearResponse: (caseId: string) => void;
}

/** @deprecated 兼容旧用法，优先使用 ResponseStateContext / ResponseActionsContext */
export interface ResponseContextValue
    extends ResponseStateContextValue, ResponseActionsContextValue {}

export const ResponseStateContext = createContext<ResponseStateContextValue | null>(null);
export const ResponseActionsContext = createContext<ResponseActionsContextValue | null>(null);
