import { describe, expect, it, vi } from 'vitest';
import { createTabDataUndoCommand } from './tabUndo';
import type { TabData } from '../../types/workspace';

const baseTab: TabData = {
    id: 'case-1',
    name: 'demo',
    protocol: 'kcbp',
    address: '127.0.0.1:21000|1001',
    params: [{ name: 'funcid', value: '1', type: 'string' }],
    createdAt: 1,
    updatedAt: 1,
};

describe('createTabDataUndoCommand', () => {
    it('returns null when updates are not undoable', () => {
        expect(
            createTabDataUndoCommand({
                activeTab: baseTab,
                updates: { favorite: true },
                apply: vi.fn(),
            }),
        ).toBeNull();
    });

    it('creates undo/redo for params changes', () => {
        const apply = vi.fn();
        const nextParams = [{ name: 'funcid', value: '2', type: 'string' as const }];
        const command = createTabDataUndoCommand({
            activeTab: baseTab,
            updates: { params: nextParams },
            apply,
            label: '修改请求参数',
        });

        expect(command?.label).toBe('修改请求参数');
        command?.undo();
        expect(apply).toHaveBeenCalledWith({ params: baseTab.params });
        command?.redo();
        expect(apply).toHaveBeenCalledWith({ params: nextParams });
    });
});
