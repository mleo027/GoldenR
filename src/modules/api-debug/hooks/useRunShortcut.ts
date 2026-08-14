import { usePlatformShortcut } from '../../../platform/shell/usePlatformShortcut';
import { PLATFORM_SHORTCUT } from '../../../platform/shell/platformShortcuts';
import { useKcbpCall } from './useKcbpCall';

export function useRunShortcut() {
    const { run } = useKcbpCall();

    usePlatformShortcut({
        ...PLATFORM_SHORTCUT.RUN,
        handler: () => {
            run();
        },
    });
}
