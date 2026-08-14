import { describe, expect, it } from 'vitest';
import { APP_MODULES } from './app-modules';
import { PLATFORM_SETTINGS_SECTIONS } from './platformSettings';

describe('settings sections registry', () => {
    it('platform sections declare category, keywords, and placement', () => {
        for (const section of PLATFORM_SETTINGS_SECTIONS) {
            expect(section.category).toBeTruthy();
            expect(section.searchKeywords.length).toBeGreaterThan(0);
            expect(['main', 'footer']).toContain(section.placement);
        }
    });

    it('module sections declare category and search keywords', () => {
        for (const module of APP_MODULES) {
            for (const section of module.settingsSections ?? []) {
                expect(section.category).toBeTruthy();
                expect(section.searchKeywords.length).toBeGreaterThan(0);
            }
        }
    });
});
