import type { TabData, ProjectData, PersistedWorkspace } from '../types/workspace';
import { paramsToCaseScript } from '../utils/script/apiScript';
import type { ClipboardCase } from '../utils/workspace/caseClipboard';

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const createEmptyCase = (index: number): TabData => {
    const now = Date.now();
    return {
        id: generateId(),
        name: `接口 ${index}`,
        protocol: 'KCBP',
        address: '',
        params: [],
        createdAt: now,
        updatedAt: now,
    };
};

/** @deprecated use createEmptyCase */
export const createEmptyTab = createEmptyCase;

export const createEmptyProject = (index: number): ProjectData => {
    const now = Date.now();
    return {
        id: generateId(),
        name: `项目 ${index}`,
        cases: [createEmptyCase(1)],
        folders: [],
        createdAt: now,
        updatedAt: now,
    };
};

export const cloneCase = (source: TabData): TabData => {
    const now = Date.now();
    const copyName = source.name.trim().endsWith('(副本)')
        ? `${source.name.trim()} ${now.toString().slice(-4)}`
        : `${source.name.trim() || '未命名接口'} (副本)`;

    return {
        id: generateId(),
        name: copyName,
        protocol: source.protocol,
        address: source.address,
        params: source.params.map((item) => ({ ...item })),
        script: source.script,
        runInput: source.runInput ? { ...source.runInput } : undefined,
        requestScript: source.requestScript,
        responseScript: source.responseScript,
        favorite: source.favorite ?? false,
        createdAt: now,
        updatedAt: now,
    };
};

export const createPastedCase = (source: ClipboardCase, folderId: string): TabData => {
    const now = Date.now();
    return {
        id: generateId(),
        folderId,
        name: source.name,
        protocol: source.protocol,
        address: source.address,
        params: source.params.map((item) => ({ ...item })),
        script: source.script,
        runInput: source.runInput ? { ...source.runInput } : undefined,
        requestScript: source.requestScript,
        responseScript: source.responseScript,
        favorite: source.favorite ?? false,
        createdAt: now,
        updatedAt: now,
    };
};

/** @deprecated use cloneCase */
export const cloneTab = cloneCase;

export const createDefaultWorkspace = (): PersistedWorkspace => {
    const project = createEmptyProject(1);
    project.cases = [
        {
            ...createEmptyCase(1),
            name: '示例接口',
            address: '127.0.0.1:21000/150501?queue=req1&timeout=15',
            params: [
                { name: 'g_serverid', value: '1', type: 'string' },
                { name: 'g_funcid', value: '150501', type: 'string' },
            ],
            script: paramsToCaseScript(
                [
                    { name: 'g_serverid', value: '1', type: 'string' },
                    { name: 'g_funcid', value: '150501', type: 'string' },
                ],
                '150501',
            ),
        },
    ];

    return {
        projects: [project],
        activeProjectIndex: 0,
        activeCaseIndex: 0,
        expandedProjectIds: [project.id],
        openCaseIds: [project.cases[0].id],
    };
};
