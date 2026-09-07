import { lazy, Suspense } from 'react';
import SettingsModalSkeleton from '@/components/ui/SettingsModalSkeleton';
import { useSettingsModal } from './useSettingsModal';

const SettingsModal = lazy(() => import('../../components/layout/SettingsModal'));

/**
 * 由 ModuleHost 在「当前激活模块」的 RootProviders 子树内挂载。
 * 模块设置面板（如数据库、提示规则）依赖模块 Context，不可移到 PlatformShell 层。
 * 平台级「外观 / 关于」面板不依赖模块 Provider。
 */
export default function SettingsModalGate() {
    const { open, initialSectionKey, closeSettings } = useSettingsModal();

    if (!open) {
        return null;
    }

    return (
        <Suspense fallback={<SettingsModalSkeleton />}>
            <SettingsModal open={open} onClose={closeSettings} initialSectionKey={initialSectionKey} />
        </Suspense>
    );
}
