import { createContext } from 'react';
import type { CommonParamSet } from '../types/commonParams';

export interface CommonParamsStateContextValue {
    sets: CommonParamSet[];
    loaded: boolean;
}

export interface CommonParamsActionsContextValue {
    addSet: (name: string) => CommonParamSet;
    renameSet: (setId: string, name: string) => void;
    deleteSet: (setId: string) => void;
    updateSetParams: (setId: string, params: CommonParamSet['params']) => void;
}

export const CommonParamsStateContext = createContext<CommonParamsStateContextValue | null>(null);
export const CommonParamsActionsContext = createContext<CommonParamsActionsContextValue | null>(
    null,
);
