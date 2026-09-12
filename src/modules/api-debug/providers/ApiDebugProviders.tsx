/**
 * API 调试模块 Provider 栈。
 * 顺序：ApiDebugEnv → ParamSuggest → CommonParams → Tabs → Response → ScriptConsole → RunLog → KcbpCall。
 * 响应缓存与 Tabs 解耦；ResponseLifecycleSync 在接口删除时清理响应。
 */
import type { ReactNode } from 'react';
import { TabsRuntime } from '../store/TabsRuntime';
import { ResponseLifecycleSync } from '../store/ResponseLifecycleSync';
import { ApiCallProvider } from '../store/apiCallProvider';
import { useApiDebugEnvStore } from '../store/apiDebugEnvStore';
import { useCommonParamsStore } from '../store/commonParamsStore';
import { useParamSuggestStore } from '../store/paramSuggestStore';
import { useRequestHistoryStore } from '../store/requestHistoryStore';
import { useEffect } from 'react';
import ApiDebugUndoFlush from '../components/ApiDebugUndoFlush';
import { KcbpFeedbackSync } from '../components/feedback/KcbpFeedbackSync';

export function ApiDebugProviders({ children }: { children: ReactNode }) {
    const loadApiDebugEnv = useApiDebugEnvStore((state) => state.load);
    const loadCommonParams = useCommonParamsStore((state) => state.load);
    const loadParamSuggest = useParamSuggestStore((state) => state.load);
    const loadRequestHistory = useRequestHistoryStore((state) => state.load);
    useEffect(() => {
        void loadApiDebugEnv();
        void loadCommonParams();
        void loadParamSuggest();
        void loadRequestHistory();
    }, [loadApiDebugEnv, loadCommonParams, loadParamSuggest, loadRequestHistory]);
    return (
        <>
            <ApiDebugUndoFlush />
            <TabsRuntime>
                <ResponseLifecycleSync />
                <ApiCallProvider>
                    <KcbpFeedbackSync />
                    {children}
                </ApiCallProvider>
            </TabsRuntime>
        </>
    );
}
