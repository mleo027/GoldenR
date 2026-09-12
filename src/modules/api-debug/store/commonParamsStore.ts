import { create } from 'zustand';
import type { CommonParamSet } from '../types/commonParams';
import { loadCommonParams, saveCommonParams } from './commonParamsData';

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export interface CommonParamsStore {
    sets: CommonParamSet[];
    loaded: boolean;
    load: () => Promise<void>;
    addSet: (name: string) => CommonParamSet;
    renameSet: (setId: string, name: string) => void;
    deleteSet: (setId: string) => void;
    updateSetParams: (setId: string, params: CommonParamSet['params']) => void;
}

let loadPromise: Promise<void> | null = null;

export const useCommonParamsStore = create<CommonParamsStore>((set, get) => {
    const persist = (sets: CommonParamSet[]) => {
        set({ sets });
        if (get().loaded) saveCommonParams(sets);
    };

    return {
        sets: [],
        loaded: false,
        load: () => {
            if (get().loaded) return Promise.resolve();
            if (!loadPromise) {
                loadPromise = loadCommonParams()
                    .then((sets) => set({ sets, loaded: true }))
                    .catch((error) => {
                        console.error('Failed to load common params:', error);
                        set({ loaded: true });
                    })
                    .finally(() => {
                        loadPromise = null;
                    });
            }
            return loadPromise;
        },
        addSet: (name) => {
            const item = { id: generateId(), name, params: [] };
            persist([...get().sets, item]);
            return item;
        },
        renameSet: (setId, name) =>
            persist(get().sets.map((item) => (item.id === setId ? { ...item, name } : item))),
        deleteSet: (setId) => persist(get().sets.filter((item) => item.id !== setId)),
        updateSetParams: (setId, params) =>
            persist(get().sets.map((item) => (item.id === setId ? { ...item, params } : item))),
    };
});
