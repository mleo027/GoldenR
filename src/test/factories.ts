import type {
    ParamItem,
    PersistedWorkspace,
    ProjectData,
    TabData,
} from '@/modules/api-debug/types/workspace';
import type { KcbpRequestOptions, KcbpResponseData } from '@/types/kcbp';
import type { DbConnectionConfig, ParamFieldRule } from '@/modules/api-debug/types/paramSuggest';
import type { KcxpEnvironment } from '@/modules/api-debug/types/kcxp';

export function createParamItem(overrides: Partial<ParamItem> = {}): ParamItem {
    return {
        name: 'g_funcid',
        value: '150501',
        type: 'string',
        ...overrides,
    };
}

export function createCaseTab(overrides: Partial<TabData> = {}): TabData {
    const now = 1_700_000_000_000;
    return {
        id: 'case-1',
        name: '接口 1',
        protocol: 'KCBP',
        address: '127.0.0.1:21000/150501?queue=req1&timeout=15',
        params: [createParamItem()],
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
}

export function createProject(
    overrides: Partial<ProjectData> & { caseCount?: number } = {},
): ProjectData {
    const now = 1_700_000_000_000;
    const caseCount = overrides.caseCount ?? 1;
    return {
        id: 'project-1',
        name: '项目 1',
        cases: Array.from({ length: caseCount }, (_, index) =>
            createCaseTab({ id: `case-${index + 1}` }),
        ),
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
}

export function createWorkspace(overrides: Partial<PersistedWorkspace> = {}): PersistedWorkspace {
    const project = createProject();
    return {
        projects: [project],
        activeProjectIndex: 0,
        activeCaseIndex: 0,
        expandedProjectIds: [project.id],
        openCaseIds: [project.cases[0].id],
        ...overrides,
    };
}

export function createKcbpResponse(overrides: Partial<KcbpResponseData> = {}): KcbpResponseData {
    return {
        code: '0',
        msg: 'ok',
        data: [{ name: '', rows: [{ custid: '1' }] }],
        stats: { timecost: 12, rows: 1 },
        ...overrides,
    };
}

export function createKcbpRequest(overrides: Partial<KcbpRequestOptions> = {}): KcbpRequestOptions {
    return {
        connection: {
            ip: '127.0.0.1',
            port: '21000',
            apiid: '150501',
            reqqueue: 'req1',
            requesttimeout: '15',
            service: 'kcbp',
        },
        param: {
            msgtype: '150501',
            fields: { g_funcid: '150501' },
        },
        ...overrides,
    };
}

export function createSuggestRule(overrides: Partial<ParamFieldRule> = {}): ParamFieldRule {
    return {
        id: 'rule-1',
        field: 'bsflag',
        type: 'select',
        datasource: {
            type: 'sql',
            db: 'mssql',
            sql: 'select value from t_bsflag',
        },
        ...overrides,
    };
}

export function createDbConfig(overrides: Partial<DbConnectionConfig> = {}): DbConnectionConfig {
    return {
        server: '127.0.0.1',
        port: 1433,
        database: 'kcbp',
        user: 'sa',
        password: 'test',
        queryTimeoutMs: 10000,
        maxRows: 500,
        ...overrides,
    };
}

export function createKcxpEnvironment(overrides: Partial<KcxpEnvironment> = {}): KcxpEnvironment {
    return {
        id: 'dev',
        name: 'DEV',
        host: '127.0.0.1:21000',
        queue: 'req1',
        timeout: '15',
        ...overrides,
    };
}
