import { describe, expect, it } from 'vitest';
import { capabilityRegistry } from '@/platform/capabilities/registry';
import './app-modules';

/**
 * 组合根级别的能力注册集成测试。
 *
 * 放在 registry 层而不是 capabilities 层：组合根是唯一允许知道"有哪些模块"的地方，
 * 而 `platform/capabilities` 必须保持模块无关。
 *
 * 这里覆盖的是"模块声明了但没人注册"或"注册了但实现/上下文缺失"这类只在装配时
 * 才暴露的问题——单测各模块时看不到。
 */
const expected = {
    automation: [
        'automation_list_scenarios',
        'automation_read_scenario',
        'automation_write_scenario',
        'automation_list_environments',
        'automation_run_scenario',
        'automation_read_report',
    ],
    apidebug: [
        'apidebug_list_projects',
        'apidebug_list_cases',
        'apidebug_read_case',
        'apidebug_create_case',
        'apidebug_update_case',
        'apidebug_call_case',
        'apidebug_read_history',
    ],
};

describe('组合根注册的平台能力', () => {
    it('两个模块的能力都被注册，且只注册一次', () => {
        const names = capabilityRegistry.list().map((descriptor) => descriptor.name);
        for (const name of [...expected.automation, ...expected.apidebug]) {
            expect(names.filter((item) => item === name)).toHaveLength(1);
        }
    });

    it('每个能力都有描述与入参 schema', () => {
        for (const descriptor of capabilityRegistry.list()) {
            expect(descriptor.name).toMatch(/^[a-z]+_[a-z_]+$/);
            expect(descriptor.description.trim()).not.toBe('');
            expect(descriptor.inputSchema.type).toBe('object');
        }
    });

    it('能力归属与命名空间一致', () => {
        for (const name of expected.automation) {
            expect(capabilityRegistry.ownerOf(name)).toEqual({
                moduleId: 'interface-automation',
                namespace: 'automation',
            });
        }
        for (const name of expected.apidebug) {
            expect(capabilityRegistry.ownerOf(name)).toEqual({
                moduleId: 'api-debug',
                namespace: 'apidebug',
            });
        }
    });

    it('描述与实现键集合双向一致，且上下文工厂可用', async () => {
        // validate() 会真正载入各模块的 handlers，并比对键集合。
        await expect(capabilityRegistry.validate()).resolves.toBeUndefined();
    });
});
