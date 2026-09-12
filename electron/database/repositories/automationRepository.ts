import type {
    AutomationFolderRunReport,
    AutomationRunReport,
    AutomationStorageSnapshot,
    AutomationWorkspace,
} from '../../../src/shared/automation/types';
import type { SqliteDatabase } from '../connection';

const encode = (value: unknown): string => JSON.stringify(value);
const decode = <T>(value: string): T => JSON.parse(value) as T;

function deleteMissing(db: SqliteDatabase, table: string, ids: string[]): void {
    if (ids.length === 0) {
        db.exec(`DELETE FROM ${table}`);
        return;
    }
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`DELETE FROM ${table} WHERE id NOT IN (${placeholders})`).run(...ids);
}

export class AutomationRepository {
    private readonly db: SqliteDatabase;

    constructor(db: SqliteDatabase) {
        this.db = db;
    }

    load(): AutomationStorageSnapshot {
        const projects = this.db
            .prepare(
                'SELECT id,name,position,created_at AS createdAt,updated_at AS updatedAt FROM automation_projects ORDER BY position',
            )
            .all() as AutomationWorkspace['projects'];
        const folders = this.db
            .prepare(
                'SELECT id,project_id AS projectId,parent_id AS parentId,name,position,created_at AS createdAt,updated_at AS updatedAt FROM automation_folders ORDER BY position',
            )
            .all() as AutomationWorkspace['folders'];
        const scenarios = (
            this.db
                .prepare(
                    'SELECT id,project_id AS projectId,folder_id AS folderId,name,script,position,enabled,created_at AS createdAt,updated_at AS updatedAt FROM automation_scenarios ORDER BY position',
                )
                .all() as Array<Record<string, unknown>>
        ).map((row) => ({
            ...row,
            folderId: row.folderId ?? undefined,
            enabled: Boolean(row.enabled),
        })) as AutomationWorkspace['scenarios'];
        const scenarioReports = Object.fromEntries(
            (
                this.db
                    .prepare('SELECT scenario_id,report_json FROM automation_scenario_reports')
                    .all() as Array<{ scenario_id: string; report_json: string }>
            ).map((row) => [row.scenario_id, decode<AutomationRunReport>(row.report_json)]),
        );
        const folderReports = Object.fromEntries(
            (
                this.db
                    .prepare('SELECT folder_id,report_json FROM automation_folder_reports')
                    .all() as Array<{ folder_id: string; report_json: string }>
            ).map((row) => [row.folder_id, decode<AutomationFolderRunReport>(row.report_json)]),
        );
        return { workspace: { projects, folders, scenarios }, scenarioReports, folderReports };
    }

    saveWorkspace(workspace: AutomationWorkspace): void {
        this.db.transaction(() => {
            const projectStatement = this.db.prepare(
                'INSERT INTO automation_projects(id,name,position,created_at,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,position=excluded.position,updated_at=excluded.updated_at',
            );
            const folderStatement = this.db.prepare(
                'INSERT INTO automation_folders(id,project_id,parent_id,name,position,created_at,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET project_id=excluded.project_id,parent_id=excluded.parent_id,name=excluded.name,position=excluded.position,updated_at=excluded.updated_at',
            );
            const scenarioStatement = this.db.prepare(
                'INSERT INTO automation_scenarios(id,project_id,folder_id,name,script,position,enabled,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET project_id=excluded.project_id,folder_id=excluded.folder_id,name=excluded.name,script=excluded.script,position=excluded.position,enabled=excluded.enabled,updated_at=excluded.updated_at',
            );
            for (const project of workspace.projects)
                projectStatement.run(
                    project.id,
                    project.name,
                    project.position,
                    project.createdAt,
                    project.updatedAt,
                );
            const pending = [...workspace.folders];
            const inserted = new Set<string>();
            while (pending.length > 0) {
                const index = pending.findIndex(
                    (folder) => !folder.parentId || inserted.has(folder.parentId),
                );
                if (index < 0) throw new Error('自动化目录存在无效父级或循环引用');
                const [folder] = pending.splice(index, 1);
                folderStatement.run(
                    folder.id,
                    folder.projectId,
                    folder.parentId ?? null,
                    folder.name,
                    folder.position,
                    folder.createdAt,
                    folder.updatedAt,
                );
                inserted.add(folder.id);
            }
            for (const scenario of workspace.scenarios)
                scenarioStatement.run(
                    scenario.id,
                    scenario.projectId,
                    scenario.folderId ?? null,
                    scenario.name,
                    scenario.script,
                    scenario.position,
                    scenario.enabled ? 1 : 0,
                    scenario.createdAt,
                    scenario.updatedAt,
                );
            deleteMissing(
                this.db,
                'automation_scenarios',
                workspace.scenarios.map((scenario) => scenario.id),
            );
            deleteMissing(
                this.db,
                'automation_folders',
                workspace.folders.map((folder) => folder.id),
            );
            deleteMissing(
                this.db,
                'automation_projects',
                workspace.projects.map((project) => project.id),
            );
        })();
    }

    saveScenarioReport(report: AutomationRunReport): void {
        this.db
            .prepare(
                'INSERT INTO automation_scenario_reports(scenario_id,run_id,ran_at,report_json) VALUES(?,?,?,?) ON CONFLICT(scenario_id) DO UPDATE SET run_id=excluded.run_id,ran_at=excluded.ran_at,report_json=excluded.report_json',
            )
            .run(report.scenarioId, report.id, report.startedAt, encode(report));
    }

    saveFolderReport(report: AutomationFolderRunReport): void {
        this.db
            .prepare(
                'INSERT INTO automation_folder_reports(folder_id,run_id,ran_at,report_json) VALUES(?,?,?,?) ON CONFLICT(folder_id) DO UPDATE SET run_id=excluded.run_id,ran_at=excluded.ran_at,report_json=excluded.report_json',
            )
            .run(report.folderId, report.id, report.startedAt, encode(report));
    }
}
