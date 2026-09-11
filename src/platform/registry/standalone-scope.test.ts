import { describe, expect, it } from 'vitest';
import { apiDebugModule } from '../../modules/api-debug';
import { API_DEBUG_MODULE_ID } from '../../modules/api-debug/constants/apiDebugEnv';
import { APP_MODULES } from './app-modules';

const REMOVED_MODULE_IDS = [
    'tcd',
    'tci',
    'autoqc',
    'tracecode',
    'knowledge',
    'sql-debugger',
    'db-env',
    'exchange-file',
];

const REMOVED_SETTINGS_KEYS = [
    'api-server',
    'api-cloudflare',
    'api-wecom',
    'api-devops',
    'api-auth',
];

describe('standalone registry scope', () => {
    it('registers only the api-debug module', () => {
        expect(APP_MODULES.map((module) => module.id)).toEqual([API_DEBUG_MODULE_ID]);
    });

    it('does not register removed GoldenAPI modules', () => {
        const registeredIds = new Set(APP_MODULES.map((module) => module.id));
        for (const moduleId of REMOVED_MODULE_IDS) {
            expect(registeredIds.has(moduleId)).toBe(false);
        }
    });

    it('keeps only core api-debug settings sections', () => {
        const keys = apiDebugModule.settingsSections?.map((section) => section.key) ?? [];
        expect(keys).toEqual(['api-request', 'api-rules', 'api-common-params']);

        for (const key of REMOVED_SETTINGS_KEYS) {
            expect(keys).not.toContain(key);
        }
    });

    it('does not expose Agent Server integration settings', () => {
        const categories = (apiDebugModule.settingsSections ?? []).map(
            (section) => section.category,
        );
        expect(categories).not.toContain('integration');
    });

    it('loaded lazy module exposes the same settings sections', async () => {
        const shell = APP_MODULES[0];
        const loaded = await (
            shell as typeof shell & {
                ensureLoaded: () => Promise<typeof shell>;
            }
        ).ensureLoaded();

        expect(loaded.settingsSections?.map((section) => section.key)).toEqual(
            apiDebugModule.settingsSections?.map((section) => section.key),
        );
    });
});
