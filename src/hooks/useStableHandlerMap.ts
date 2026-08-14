import { useCallback, useMemo, useRef } from 'react';
import type { ParamItem } from '../modules/api-debug/types/workspace';

export function paramsEqual(left: ParamItem[], right: ParamItem[]): boolean {
    if (left.length !== right.length) return false;
    return left.every(
        (item, index) =>
            item.name === right[index].name &&
            item.value === right[index].value &&
            item.type === right[index].type,
    );
}

export function useStableHandlerMap<Key extends string>(
    createHandler: (key: Key) => () => void,
): (key: Key) => () => void {
    const createHandlerRef = useRef(createHandler);
    createHandlerRef.current = createHandler;
    const handlersRef = useRef(new Map<Key, () => void>());

    return useCallback((key: Key) => {
        const cached = handlersRef.current.get(key);
        if (cached) return cached;

        const handler = () => {
            createHandlerRef.current(key)();
        };
        handlersRef.current.set(key, handler);
        return handler;
    }, []);
}

export function useCaseHandlerKey(projectIndex: number, caseIndex: number): string {
    return useMemo(() => `${projectIndex}:${caseIndex}`, [caseIndex, projectIndex]);
}
