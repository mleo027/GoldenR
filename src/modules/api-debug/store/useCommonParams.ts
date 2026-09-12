import { useCommonParamsStore } from './commonParamsStore';
import { useShallow } from 'zustand/react/shallow';

export function useCommonParamsState() {
    return useCommonParamsStore(useShallow(({ sets, loaded }) => ({ sets, loaded })));
}

export function useCommonParamsActions() {
    return useCommonParamsStore(
        useShallow(({ addSet, renameSet, deleteSet, updateSetParams }) => ({
            addSet,
            renameSet,
            deleteSet,
            updateSetParams,
        })),
    );
}
