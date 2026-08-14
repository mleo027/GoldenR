import { describe, expect, it, vi } from 'vitest';
import {
    createFakeAppLifecycle,
    createFakeConfigRepository,
    createFakeKcbpPort,
    createFakeSqlQueryPort,
    createFakeWorkspaceRepository,
} from './fakes';

describe('test fakes', () => {
    it('records KCBP calls and resets', async () => {
        const kcbp = createFakeKcbpPort();
        const result = await kcbp.call({ connection: {}, param: {} });
        expect(kcbp.calls).toHaveLength(1);
        expect(result.code).toBe('0');

        kcbp.reset();
        expect(kcbp.calls).toHaveLength(0);
    });

    it('records SQL queries and config writes', async () => {
        const sql = createFakeSqlQueryPort();
        await sql.queryScript({ sql: 'select 1' });
        expect(sql.calls[0].sql).toBe('select 1');

        const config = createFakeConfigRepository();
        await config.write('project.json', { projects: [] });
        expect(config.files.get('project.json')).toEqual({ projects: [] });
        expect(config.calls[0]).toEqual({ type: 'write', name: 'project.json' });
    });

    it('supports workspace and lifecycle fakes', async () => {
        const workspace = createFakeWorkspaceRepository();
        await workspace.save(workspace.getWorkspace());
        expect(workspace.writeCount()).toBe(1);

        const lifecycle = createFakeAppLifecycle();
        const callback = vi.fn();
        lifecycle.onFlushStorage(callback);
        await lifecycle.triggerFlush();
        expect(callback).toHaveBeenCalledTimes(1);
        expect(lifecycle.flushCalls).toEqual(['flush']);
    });
});
