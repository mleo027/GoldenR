import { describe, expect, it } from 'vitest';
import {
    createCaseTab,
    createDbConfig,
    createKcxpEnvironment,
    createKcbpRequest,
    createKcbpResponse,
    createParamItem,
    createProject,
    createSuggestRule,
    createWorkspace,
} from './factories';

describe('test factories', () => {
    it('creates stable workspace and case fixtures', () => {
        const item = createParamItem();
        const tab = createCaseTab();
        const project = createProject({ caseCount: 2 });
        const workspace = createWorkspace({ projects: [project] });

        expect(item.name).toBe('g_funcid');
        expect(tab.address).toContain('/150501');
        expect(project.cases).toHaveLength(2);
        expect(workspace.projects[0].id).toBe('project-1');
    });

    it('creates KCBP, suggest, db, and env fixtures with sane defaults', () => {
        expect(createKcbpRequest().param.msgtype).toBe('150501');
        expect(createKcbpResponse().stats.rows).toBe(1);
        expect(createSuggestRule().field).toBe('bsflag');
        expect(createDbConfig().database).toBe('kcbp');
        expect(createKcxpEnvironment().host).toBe('127.0.0.1:21000');
    });
});
