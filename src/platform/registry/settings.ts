import { APP_MODULES } from './app-modules';
import type { ModuleSettingsSection } from './types';

export function getVisibleModuleSettingsSections(activeModuleId: string): ModuleSettingsSection[] {
    return APP_MODULES.flatMap((module) => module.settingsSections ?? []).filter(
        (section) => !section.moduleId || section.moduleId === activeModuleId,
    );
}
