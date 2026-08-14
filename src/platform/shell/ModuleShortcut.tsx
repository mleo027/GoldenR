import { usePlatformShortcut, type PlatformShortcutOptions } from './usePlatformShortcut';

export default function ModuleShortcut(options: PlatformShortcutOptions) {
    usePlatformShortcut(options);
    return null;
}
