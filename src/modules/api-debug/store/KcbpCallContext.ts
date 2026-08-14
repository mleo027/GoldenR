import { createContext } from 'react';

export interface KcbpCallContextValue {
    /** 当前正在请求的接口 caseId；与 activeTab 一致时 UI 才显示 Cancel */
    runningCaseId: string | null;
    /** 当前选中接口是否处于请求中 */
    loading: boolean;
    run: () => Promise<void>;
    cancel: () => void;
}

export interface KcbpCallStoreValue {
    runningCaseId: string | null;
    run: () => Promise<void>;
    cancel: () => void;
}

export const KcbpCallContext = createContext<KcbpCallStoreValue | null>(null);
