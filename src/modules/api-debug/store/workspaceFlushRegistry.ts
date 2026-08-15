type WorkspaceDraftFlusher = () => Promise<void>;

const flushers = new Set<WorkspaceDraftFlusher>();

export function registerWorkspaceDraftFlusher(flusher: WorkspaceDraftFlusher): () => void {
    flushers.add(flusher);
    return () => {
        flushers.delete(flusher);
    };
}

export async function flushWorkspaceDrafts(): Promise<void> {
    const results = await Promise.allSettled([...flushers].map((flusher) => flusher()));
    const errors = results
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map((result) => result.reason);
    if (errors.length > 0) {
        throw new Error(`Workspace draft flush failed: ${errors.map(String).join('; ')}`);
    }
}
