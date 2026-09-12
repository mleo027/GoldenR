import { describe, expect, it } from 'vitest';
import { collectFolderScenarios } from './folderScenarios';

describe('collectFolderScenarios', () => {
    it('uses folder depth-first and scenario position order', () => {
        const base = { projectId: 'p', createdAt: 0, updatedAt: 0 };
        const workspace = {
            projects: [{ id: 'p', name: 'P', position: 0, createdAt: 0, updatedAt: 0 }],
            folders: [
                { ...base, id: 'root', name: 'root', position: 0 },
                { ...base, id: 'child', parentId: 'root', name: 'child', position: 0 },
            ],
            scenarios: [
                {
                    ...base,
                    id: 'b',
                    folderId: 'root',
                    name: 'b',
                    script: '',
                    position: 1,
                    enabled: true,
                },
                {
                    ...base,
                    id: 'a',
                    folderId: 'root',
                    name: 'a',
                    script: '',
                    position: 0,
                    enabled: true,
                },
                {
                    ...base,
                    id: 'c',
                    folderId: 'child',
                    name: 'c',
                    script: '',
                    position: 0,
                    enabled: false,
                },
            ],
        };
        expect(collectFolderScenarios(workspace, 'root').map((item) => item.id)).toEqual([
            'a',
            'b',
            'c',
        ]);
    });
});
