export interface SuggestOption {
    value: string;
    label: string;
}

interface CacheEntry {
    options: SuggestOption[];
    expiresAt: number;
}

class SuggestCache {
    private cache = new Map<string, CacheEntry>();

    get(key: string): SuggestOption[] | null {
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        return entry.options;
    }

    set(key: string, options: SuggestOption[], ttlSeconds: number): void {
        this.cache.set(key, {
            options,
            expiresAt: Date.now() + ttlSeconds * 1000,
        });
    }

    invalidate(field?: string): void {
        if (!field) {
            this.cache.clear();
            return;
        }
        const prefix = `${field.toLowerCase()}|`;
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
            }
        }
    }
}

export const suggestCache = new SuggestCache();
