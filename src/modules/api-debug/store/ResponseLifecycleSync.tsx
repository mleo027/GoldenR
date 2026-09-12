import { useEffect, useMemo } from 'react';
import { useTabsState } from './useTabs';
import { useResponseActions, useResponseState } from './useResponse';
import { useScriptConsoleActions, useScriptConsoleState } from './useScriptConsole';

/** 当接口从工作区移除时，同步清理 Response / ScriptConsole 中的缓存 */
export function ResponseLifecycleSync() {
    const { state } = useTabsState();
    const { responses } = useResponseState();
    const { clearResponse } = useResponseActions();
    const { consoles } = useScriptConsoleState();
    const { clearScriptConsole } = useScriptConsoleActions();

    const validCaseIds = useMemo(
        () =>
            new Set(
                state.projects.flatMap((project) => project.cases.map((caseItem) => caseItem.id)),
            ),
        [state.projects],
    );

    useEffect(() => {
        for (const caseId of Object.keys(responses)) {
            if (!validCaseIds.has(caseId)) {
                clearResponse(caseId);
            }
        }
    }, [clearResponse, responses, validCaseIds]);

    useEffect(() => {
        for (const caseId of Object.keys(consoles)) {
            if (!validCaseIds.has(caseId)) {
                clearScriptConsole(caseId);
            }
        }
    }, [clearScriptConsole, consoles, validCaseIds]);

    return null;
}
