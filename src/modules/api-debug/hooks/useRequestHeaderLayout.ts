import { useEffect, useRef, useState } from 'react';
import { resolvePathBarLayout, type PathBarLayout } from '../utils/pathBarLayout';

export function useRequestHeaderLayout<T extends HTMLElement>() {
    const ref = useRef<T>(null);
    const [layout, setLayout] = useState<PathBarLayout>('full');

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const update = () => {
            setLayout(resolvePathBarLayout(element.clientWidth));
        };

        update();
        const observer = new ResizeObserver(update);
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    return { ref, layout };
}
