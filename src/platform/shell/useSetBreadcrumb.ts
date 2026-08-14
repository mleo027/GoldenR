import { useEffect } from 'react';
import { useBreadcrumb } from './useBreadcrumb';

export function useSetBreadcrumb(label: string): void {
    const { setBreadcrumb } = useBreadcrumb();

    useEffect(() => {
        setBreadcrumb(label);
    }, [label, setBreadcrumb]);
}
