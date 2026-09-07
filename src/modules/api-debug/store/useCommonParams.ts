import { useContext } from 'react';
import { CommonParamsActionsContext, CommonParamsStateContext } from './CommonParamsContext';

export function useCommonParamsState() {
    const context = useContext(CommonParamsStateContext);
    if (!context) throw new Error('useCommonParamsState must be used within CommonParamsProvider');
    return context;
}

export function useCommonParamsActions() {
    const context = useContext(CommonParamsActionsContext);
    if (!context)
        throw new Error('useCommonParamsActions must be used within CommonParamsProvider');
    return context;
}
