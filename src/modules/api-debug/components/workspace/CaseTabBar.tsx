import { memo, useCallback, useMemo } from 'react';
import { StarFilled } from '@ant-design/icons';
import TitleBarTabBar from '../../../../platform/shell/TitleBarTabBar';
import { useTabsActions, useTabsNavigation } from '../../store/useTabs';
import { useKcbpCall } from '../../hooks/useKcbpCall';
import { findCaseLocation } from '../../utils/workspace/openCaseTabs';
import { getCaseLabel } from '../../utils/workspace/caseLabel';

interface CaseTabBarProps {
    variant?: 'default' | 'title-bar';
}

function CaseTabBar({ variant = 'default' }: CaseTabBarProps) {
    const { runningCaseId, cancel } = useKcbpCall();
    const { projects, activeProjectIndex, activeCaseIndex, openCaseIds } = useTabsNavigation();
    const { selectCase, closeCaseTab } = useTabsActions();

    const activeCaseId = projects[activeProjectIndex]?.cases[activeCaseIndex]?.id ?? null;

    const handleSelect = useCallback(
        (projectIndex: number, caseIndex: number, caseId: string) => {
            if (caseId === activeCaseId) return;
            selectCase(projectIndex, caseIndex);
        },
        [activeCaseId, selectCase],
    );

    const handleClose = useCallback(
        (caseId: string) => {
            if (runningCaseId === caseId) {
                cancel();
            }
            closeCaseTab(caseId);
        },
        [cancel, closeCaseTab, runningCaseId],
    );

    const tabs = useMemo(
        () =>
            openCaseIds
                .map((caseId) => {
                    const location = findCaseLocation(projects, caseId);
                    if (!location) return null;
                    const caseItem = projects[location.projectIndex].cases[location.caseIndex];
                    return {
                        caseId,
                        location,
                        caseItem,
                        label: getCaseLabel(caseItem, location.caseIndex),
                    };
                })
                .filter((item) => item != null),
        [openCaseIds, projects],
    );

    const handleCloseOthers = useCallback(() => {
        if (!activeCaseId) return;
        openCaseIds
            .filter((caseId) => caseId !== activeCaseId)
            .forEach((caseId) => {
                if (runningCaseId === caseId) {
                    cancel();
                }
                closeCaseTab(caseId);
            });
    }, [activeCaseId, cancel, closeCaseTab, openCaseIds, runningCaseId]);

    const items = useMemo(
        () =>
            tabs.map(({ caseId, location, caseItem, label }) => ({
                key: caseId,
                label,
                active: caseId === activeCaseId,
                icon: caseItem.favorite ? (
                    <StarFilled className="case-tab-favorite-icon" />
                ) : undefined,
                onSelect: () => handleSelect(location.projectIndex, location.caseIndex, caseId),
                onClose: () => handleClose(caseId),
            })),
        [activeCaseId, handleClose, handleSelect, tabs],
    );

    return (
        <TitleBarTabBar
            items={items}
            variant={variant}
            onCloseOthers={openCaseIds.length > 1 ? handleCloseOthers : undefined}
        />
    );
}

export default memo(CaseTabBar);
