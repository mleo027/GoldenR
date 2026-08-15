import type { ParamItem } from '../../types/workspace';

type DraftFlusher = () => void;

export interface TabDraftSnapshot {
    params?: ParamItem[];
    address?: string;
    script?: string;
}

type TabDraftReader = () => TabDraftSnapshot;

const flushers = new Set<DraftFlusher>();
const readers = new Set<TabDraftReader>();

export function registerTabDraftFlusher(flusher: DraftFlusher): () => void {
    flushers.add(flusher);
    return () => {
        flushers.delete(flusher);
    };
}

export function registerTabDraftReader(reader: TabDraftReader): () => void {
    readers.add(reader);
    return () => {
        readers.delete(reader);
    };
}

export function readPendingTabDrafts(): TabDraftSnapshot {
    const snapshot: TabDraftSnapshot = {};
    readers.forEach((reader) => {
        Object.assign(snapshot, reader());
    });
    return snapshot;
}

export function flushAllTabDrafts(): TabDraftSnapshot {
    const snapshot = readPendingTabDrafts();
    const errors: unknown[] = [];
    flushers.forEach((flusher) => {
        try {
            flusher();
        } catch (error) {
            errors.push(error);
        }
    });
    if (errors.length > 0) {
        throw new Error(`Tab draft flush failed: ${errors.map(String).join('; ')}`);
    }
    return snapshot;
}
