import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { readJsonFileAt, writeJsonFileAt } from './jsonStorage';

describe('writeJsonFileAt', () => {
    it('writes and replaces an existing json file', async () => {
        const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'golden-json-storage-'));
        const filePath = path.join(dir, 'project.json');
        try {
            await writeJsonFileAt(filePath, { version: 1 });
            await writeJsonFileAt(filePath, { version: 2, projects: [] });

            const parsed = (await readJsonFileAt(filePath)) as { version: number; projects?: [] };
            expect(parsed.version).toBe(2);
            expect(parsed.projects).toEqual([]);
        } finally {
            await fs.rm(dir, { recursive: true, force: true });
        }
    });
});
