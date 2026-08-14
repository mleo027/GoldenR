/** API 调试主布局：左侧用例集侧边栏 + 右侧请求/响应 Tab 工作区 */
import { useCallback, useRef } from 'react';
import PlatformModuleLayout from '../../../platform/shell/PlatformModuleLayout';
import ModuleShortcut from '../../../platform/shell/ModuleShortcut';
import { PLATFORM_SHORTCUT } from '../../../platform/shell/platformShortcuts';
import CaseSidebar, { type CaseSidebarHandle } from '../components/workspace/CaseSidebar';
import Tab from './Tab';
import { useRunShortcut } from '../hooks/useRunShortcut';

export default function ApiDebugLayout() {
    const sidebarRef = useRef<CaseSidebarHandle>(null);
    const focusSidebarSearch = useCallback(() => {
        sidebarRef.current?.focusSearch();
    }, []);

    useRunShortcut();

    return (
        <PlatformModuleLayout
            autoSaveId="golden-case-layout-1x4"
            sidebar={<CaseSidebar ref={sidebarRef} />}
            main={<Tab />}
            mainOptions={{ card: 'none' }}
            listeners={
                <ModuleShortcut {...PLATFORM_SHORTCUT.QUICK_OPEN} handler={focusSidebarSearch} />
            }
        />
    );
}
