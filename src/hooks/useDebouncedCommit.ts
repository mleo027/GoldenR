import { useCallback, useEffect, useRef, useState } from 'react';

interface UseDebouncedCommitOptions<T> {
    delayMs: number;
    onCommit: (value: T) => void;
    isEqual?: (left: T, right: T) => boolean;
}

/**
 * 受控草稿 + 防抖提交：本地即时更新，延迟后同步到 store。
 */
export function useDebouncedCommit<T>(
    committedValue: T,
    { delayMs, onCommit, isEqual }: UseDebouncedCommitOptions<T>,
) {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onCommitRef = useRef(onCommit);
    const isEqualRef = useRef(isEqual);
    const draftRef = useRef(committedValue);
    const [draft, setDraftState] = useState(committedValue);

    onCommitRef.current = onCommit;
    isEqualRef.current = isEqual;

    const equals = useCallback((left: T, right: T) => {
        if (isEqualRef.current) {
            return isEqualRef.current(left, right);
        }
        return Object.is(left, right);
    }, []);

    const setDraft = useCallback((value: T) => {
        draftRef.current = value;
        setDraftState(value);
    }, []);

    const commitNow = useCallback(
        (value: T = draftRef.current) => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            if (!equals(value, committedValue)) {
                onCommitRef.current(value);
            }
        },
        [committedValue, equals],
    );

    const flushPending = useCallback(() => {
        if (timerRef.current) {
            commitNow(draftRef.current);
        }
    }, [commitNow]);

    const setDraftDebounced = useCallback(
        (value: T) => {
            setDraft(value);
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            timerRef.current = setTimeout(() => {
                if (!equals(value, committedValue)) {
                    onCommitRef.current(value);
                }
                timerRef.current = null;
            }, delayMs);
        },
        [committedValue, delayMs, equals, setDraft],
    );

    useEffect(() => {
        if (!equals(committedValue, draftRef.current)) {
            setDraft(committedValue);
        }
    }, [committedValue, equals, setDraft]);

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    return {
        draft,
        setDraftDebounced,
        commitNow,
        flushPending,
    };
}
