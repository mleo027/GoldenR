import { useCallback, useEffect, useRef, useState } from 'react';

interface UseDebouncedDraftOptions {
    delayMs: number;
    onCommit: (value: string) => void;
}

/**
 * 受控草稿 + 防抖提交：输入即时更新 draft，延迟后同步到 committed 值。
 */
export function useDebouncedDraft(
    committedValue: string,
    { delayMs, onCommit }: UseDebouncedDraftOptions,
) {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [draft, setDraft] = useState(committedValue);

    useEffect(() => {
        setDraft(committedValue);
    }, [committedValue]);

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    const commitNow = useCallback(
        (value: string = draft) => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            onCommit(value);
        },
        [draft, onCommit],
    );

    const setDraftDebounced = useCallback(
        (value: string) => {
            setDraft(value);
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            timerRef.current = setTimeout(() => {
                onCommit(value);
                timerRef.current = null;
            }, delayMs);
        },
        [delayMs, onCommit],
    );

    const clearDraft = useCallback(() => {
        setDraft('');
        commitNow('');
    }, [commitNow]);

    const flushPending = useCallback(() => {
        if (timerRef.current) {
            commitNow(draft);
        }
    }, [commitNow, draft]);

    return {
        draft,
        setDraftDebounced,
        commitNow,
        clearDraft,
        flushPending,
    };
}
