import { useContext, useEffect } from 'react';
import { message } from 'antd';
import {
    KcbpFeedbackBridgeContext,
    type KcbpFeedbackMessage,
} from '../../store/kcbpFeedbackContext';

export function KcbpFeedbackSync() {
    const bridge = useContext(KcbpFeedbackBridgeContext);

    useEffect(() => {
        if (!bridge) return undefined;
        const handler = (feedback: KcbpFeedbackMessage) => {
            message[feedback.level](feedback.content);
        };
        bridge.register(handler);
        return () => bridge.register(null);
    }, [bridge]);

    return null;
}
