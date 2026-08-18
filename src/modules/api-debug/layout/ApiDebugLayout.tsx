/** API 调试主布局：左侧用例集侧边栏 + 右侧请求/响应 Tab 工作区 */
import { useCallback, useRef } from 'react';
import PlatformModuleLayout from '../../../platform/shell/PlatformModuleLayout';
import ModuleShortcut from '../../../platform/shell/ModuleShortcut';
import { PLATFORM_SHORTCUT } from '../../../platform/shell/platformShortcuts';
import CaseSidebar, { type CaseSidebarHandle } from '../components/workspace/CaseSidebar';
import RequestHistoryPage from '../components/history/RequestHistoryPage';
import HistoryDetailTab from '../components/history/HistoryDetailTab';
import { useRequestHistoryNavigation } from '../store/useRequestHistoryNavigation';
import Tab from './Tab';
import { useRunShortcut } from '../hooks/useRunShortcut';

export default function ApiDebugLayout() {
    const sidebarRef = useRef<CaseSidebarHandle>(null);
    const { view, detailId, openHistory, closeHistory } = useRequestHistoryNavigation();
    const historyOpen = view !== 'editor';
    const focusSidebarSearch = useCallback(() => {
        sidebarRef.current?.focusSearch();
    }, []);

    useRunShortcut();

    return (
        <PlatformModuleLayout
            autoSaveId="golden-case-layout-1x4"
            fullMain={historyOpen}
            sidebar={<CaseSidebar ref={sidebarRef} onOpenHistory={openHistory} />}
            main={
                view === 'history-detail' && detailId ? (
                    <HistoryDetailTab entryId={detailId} />
                ) : historyOpen ? (
                    <RequestHistoryPage onClose={closeHistory} />
                ) : (
                    <Tab />
                )
            }
            mainOptions={{ card: 'none' }}
            listeners={
                <>
                    <ModuleShortcut
                        {...PLATFORM_SHORTCUT.QUICK_OPEN}
                        handler={focusSidebarSearch}
                    />
                    <ModuleShortcut {...PLATFORM_SHORTCUT.HISTORY} handler={openHistory} />
                </>
            }
        />
    );
}
