import { createContext } from 'react';

export type KcbpFeedbackLevel = 'success' | 'info' | 'warning' | 'error';

export interface KcbpFeedbackMessage {
    level: KcbpFeedbackLevel;
    content: string;
}

export type KcbpFeedbackHandler = (feedback: KcbpFeedbackMessage) => void;

export interface KcbpFeedbackBridgeValue {
    register: (handler: KcbpFeedbackHandler | null) => void;
}

export const KcbpFeedbackBridgeContext = createContext<KcbpFeedbackBridgeValue | null>(null);
