import { useEffect, useState } from 'react';
import { getElectronAPI } from '@/lib/electron';

export function useUserDataDir(): string | null {
    const [dir, setDir] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        void getElectronAPI()
            ?.getUserDataDir?.()
            .then((value) => {
                if (!cancelled) setDir(value);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    return dir;
}

export function joinUserDataFile(userDataDir: string | null, fileName: string): string | null {
    if (!userDataDir || !fileName) return null;
    const sep = userDataDir.includes('\\') ? '\\' : '/';
    const base = userDataDir.replace(/[/\\]+$/, '');
    return `${base}${sep}${fileName}`;
}
