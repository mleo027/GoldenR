import { describe, expect, it } from 'vitest';
import { buildCaseFolderTree, getCaseFolderPath, isCaseFolderDescendant } from './caseFolders';
import { createEmptyProject } from '../../constants/workspace';

describe('case folder tree', () => {
    it('builds nested folders and keeps root cases separate', () => {
        const project = createEmptyProject(1);
        project.folders = [
            { id: 'a', name: 'A', position: 0, createdAt: 1, updatedAt: 1 },
            { id: 'b', name: 'B', parentId: 'a', position: 0, createdAt: 1, updatedAt: 1 },
        ];
        project.cases[0].folderId = 'b';
        const tree = buildCaseFolderTree(project);
        expect(tree.root[0].folders[0].folder.id).toBe('b');
        expect(tree.root[0].folders[0].cases[0].caseItem.id).toBe(project.cases[0].id);
        expect(tree.rootCases).toHaveLength(0);
        expect(getCaseFolderPath(project.folders, 'b')).toEqual(['A', 'B']);
    });

    it('detects descendant moves but not sibling moves', () => {
        const folders = [
            { id: 'a', name: 'A', parentId: undefined, position: 0, createdAt: 1, updatedAt: 1 },
            { id: 'b', name: 'B', parentId: 'a', position: 0, createdAt: 1, updatedAt: 1 },
            { id: 'c', name: 'C', parentId: undefined, position: 1, createdAt: 1, updatedAt: 1 },
        ];
        expect(isCaseFolderDescendant(folders, 'a', 'b')).toBe(true);
        expect(isCaseFolderDescendant(folders, 'a', 'c')).toBe(false);
    });
});
