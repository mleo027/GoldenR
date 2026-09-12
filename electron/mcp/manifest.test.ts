import { beforeEach, describe, expect, it } from 'vitest';
import type { CapabilityDescriptor } from '../../src/shared/capabilities/types';
import { getCapabilityManifestSize, listMcpTools, setCapabilityManifest } from './manifest';

const descriptors: CapabilityDescriptor[] = [
    {
        name: 'automation_run_scenario',
        description: '运行场景',
        inputSchema: { type: 'object', properties: {}, required: ['scenarioId'] },
    },
    {
        name: 'automation_list_scenarios',
        description: '列出场景',
        inputSchema: { type: 'object', properties: {} },
    },
];

beforeEach(() => {
    setCapabilityManifest([]);
});

describe('能力清单', () => {
    it('把能力描述映射成 MCP 工具定义', () => {
        setCapabilityManifest(descriptors);

        expect(listMcpTools()).toEqual([
            {
                name: 'automation_run_scenario',
                description: '运行场景',
                inputSchema: { type: 'object', properties: {}, required: ['scenarioId'] },
            },
            {
                name: 'automation_list_scenarios',
                description: '列出场景',
                inputSchema: { type: 'object', properties: {} },
            },
        ]);
        expect(getCapabilityManifestSize()).toBe(2);
    });

    it('渲染层还没推送时为空白，而不是抛错', () => {
        expect(listMcpTools()).toEqual([]);
        expect(getCapabilityManifestSize()).toBe(0);
    });

    it('重复推送会替换而不是累加', () => {
        setCapabilityManifest(descriptors);
        setCapabilityManifest([descriptors[0]]);
        expect(getCapabilityManifestSize()).toBe(1);
    });
});
