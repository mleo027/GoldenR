import { describe, expect, it } from 'vitest';
import { validateAutomationWriteSql } from './sqlPolicy';

describe('validateAutomationWriteSql', () => {
    it.each([
        'INSERT INTO t(id) VALUES(@id)',
        'UPDATE t SET v=@v',
        'DELETE FROM t',
        'MERGE t USING s ON 1=0 WHEN NOT MATCHED THEN INSERT DEFAULT VALUES',
        'EXEC dbo.prepare_test @id',
    ])('allows a single write statement: %s', (sql) => {
        expect(validateAutomationWriteSql(sql)).toEqual({ ok: true });
    });

    it.each([
        'SELECT * FROM t',
        'DROP TABLE t',
        'BEGIN TRANSACTION',
        'EXEC(@sql)',
        'EXEC @sql',
        'EXECUTE @statement',
        'EXEC sp_executesql @sql',
        'UPDATE t SET v=1; DELETE FROM t',
    ])('rejects unsafe SQL: %s', (sql) => {
        expect(validateAutomationWriteSql(sql).ok).toBe(false);
    });
});
