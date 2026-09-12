import type { AutomationScenario, AutomationWorkspace } from '@/shared/automation/types';

export function collectFolderScenarios(
    workspace: AutomationWorkspace,
    folderId: string,
): AutomationScenario[] {
    const direct = workspace.scenarios
        .filter((item) => item.folderId === folderId)
        .sort((a, b) => a.position - b.position);
    const children = workspace.folders
        .filter((item) => item.parentId === folderId)
        .sort((a, b) => a.position - b.position)
        .flatMap((item) => collectFolderScenarios(workspace, item.id));
    return [...direct, ...children];
}
