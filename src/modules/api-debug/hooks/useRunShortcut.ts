import { usePlatformShortcut } from '../../../platform/shell/usePlatformShortcut';
import { PLATFORM_SHORTCUT } from '../../../platform/shell/platformShortcuts';
import { useApiCall } from './useApiCall';

export function useRunShortcut() {
    const { run } = useApiCall();

    usePlatformShortcut({
        ...PLATFORM_SHORTCUT.RUN,
        handler: () => {
            void run();
        },
    });
}
