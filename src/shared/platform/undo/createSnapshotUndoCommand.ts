import type { UndoCommand } from './types';

export function createSnapshotUndoCommand<T>(args: {
    label?: string;
    before: T;
    after: T;
    isEqual?: (left: T, right: T) => boolean;
    apply: (value: T) => void;
}): UndoCommand | null {
    const equals = args.isEqual ?? Object.is;
    if (equals(args.before, args.after)) {
        return null;
    }

    const before = structuredClone(args.before);
    const after = structuredClone(args.after);

    return {
        label: args.label,
        undo: () => args.apply(before),
        redo: () => args.apply(after),
    };
}
