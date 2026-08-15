/**
 * API 调试模块 Provider 栈。
 * 顺序：ApiDebugEnv → ParamSuggest → Tabs → Response → ScriptConsole → RunLog → KcbpCall。
 * 响应缓存与 Tabs 解耦；ResponseLifecycleSync 在接口删除时清理响应。
 */
import type { ReactNode } from 'react';
import { TabsProvider } from '../store/tabsStore';
import { ResponseProvider } from '../store/responseStore';
import { ScriptConsoleProvider } from '../store/scriptConsoleStore';
import { ResponseLifecycleSync } from '../store/ResponseLifecycleSync';
import { KcbpCallProvider } from '../store/kcbpCallStore';
import { ParamSuggestProvider } from '../store/paramSuggestStore';
import { ApiDebugEnvProvider } from '../store/apiDebugEnvStore';
import { RunLogProvider } from '../store/runLogStore';
import { RequestHistoryProvider } from '../store/requestHistoryStore';
import ApiDebugUndoFlush from '../components/ApiDebugUndoFlush';
import { KcbpFeedbackSync } from '../components/feedback/KcbpFeedbackSync';

export function ApiDebugProviders({ children }: { children: ReactNode }) {
    return (
        <ApiDebugEnvProvider>
            <ParamSuggestProvider>
                <ApiDebugUndoFlush />
                <TabsProvider>
                    <RequestHistoryProvider>
                        <ResponseProvider>
                            <ScriptConsoleProvider>
                                <ResponseLifecycleSync />
                                <RunLogProvider>
                                    <KcbpCallProvider>
                                        <KcbpFeedbackSync />
                                        {children}
                                    </KcbpCallProvider>
                                </RunLogProvider>
                            </ScriptConsoleProvider>
                        </ResponseProvider>
                    </RequestHistoryProvider>
                </TabsProvider>
            </ParamSuggestProvider>
        </ApiDebugEnvProvider>
    );
}
