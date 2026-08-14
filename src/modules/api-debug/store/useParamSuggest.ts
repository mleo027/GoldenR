import { useContext } from 'react';
import { ParamSuggestContext, type ParamSuggestContextValue } from './ParamSuggestContext';

export function useParamSuggest(): ParamSuggestContextValue {
    const context = useContext(ParamSuggestContext);
    if (!context) {
        throw new Error('useParamSuggest must be used within a ParamSuggestProvider');
    }
    return context;
}
