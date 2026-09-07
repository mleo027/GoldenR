import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { CommonParamSet } from '../types/commonParams';
import { loadCommonParams, saveCommonParams } from './commonParamsData';
import { CommonParamsActionsContext, CommonParamsStateContext } from './CommonParamsContext';

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export function CommonParamsProvider({ children }: { children: ReactNode }) {
    const [sets, setSets] = useState<CommonParamSet[]>([]);
    const [loaded, setLoaded] = useState(false);
    const setsRef = useRef(sets);
    setsRef.current = sets;

    useEffect(() => {
        void loadCommonParams()
            .then((cached) => {
                setSets(cached);
                setLoaded(true);
            })
            .catch((error) => {
                console.error('Failed to load common params:', error);
                setLoaded(true);
            });
    }, []);

    const persist = useCallback((next: CommonParamSet[]) => {
        setsRef.current = next;
        setSets(next);
        saveCommonParams(next);
    }, []);

    const addSet = useCallback(
        (name: string) => {
            const set: CommonParamSet = { id: generateId(), name, params: [] };
            persist([...setsRef.current, set]);
            return set;
        },
        [persist],
    );

    const renameSet = useCallback(
        (setId: string, name: string) => {
            persist(setsRef.current.map((set) => (set.id === setId ? { ...set, name } : set)));
        },
        [persist],
    );

    const deleteSet = useCallback(
        (setId: string) => {
            persist(setsRef.current.filter((set) => set.id !== setId));
        },
        [persist],
    );

    const updateSetParams = useCallback(
        (setId: string, params: CommonParamSet['params']) => {
            persist(setsRef.current.map((set) => (set.id === setId ? { ...set, params } : set)));
        },
        [persist],
    );

    const stateValue = useMemo(() => ({ sets, loaded }), [sets, loaded]);
    const actionsValue = useMemo(
        () => ({ addSet, renameSet, deleteSet, updateSetParams }),
        [addSet, deleteSet, renameSet, updateSetParams],
    );

    return (
        <CommonParamsStateContext.Provider value={stateValue}>
            <CommonParamsActionsContext.Provider value={actionsValue}>
                {children}
            </CommonParamsActionsContext.Provider>
        </CommonParamsStateContext.Provider>
    );
}
