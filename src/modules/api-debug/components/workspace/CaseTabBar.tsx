import { memo, useCallback, useMemo } from 'react';
import { HistoryOutlined, StarFilled } from '@ant-design/icons';
import TitleBarTabBar, { type TitleBarTabItem } from '../../../../platform/shell/TitleBarTabBar';
import { useTabsActions, useTabsNavigation } from '../../store/useTabs';
import { useKcbpCall } from '../../hooks/useKcbpCall';
import { useRequestHistoryNavigation } from '../../store/useRequestHistoryNavigation';
import { useRequestHistoryState } from '../../store/useRequestHistory';
import { findCaseLocation } from '../../utils/workspace/openCaseTabs';
import { getCaseLabel } from '../../utils/workspace/caseLabel';
import type { CaseLocation } from '../../utils/workspace/openCaseTabs';
import type { ProjectData, TabData } from '../../types/workspace';

interface CaseTabBarProps {
    variant?: 'default' | 'title-bar';
}

interface CaseTabBarTab {
    caseId: string;
    location: CaseLocation;
    caseItem: TabData;
    label: string;
}

function getOpenCaseTabs(projects: ProjectData[], openCaseIds: string[]): CaseTabBarTab[] {
    return openCaseIds
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
        .filter((item) => item != null);
}

function buildCaseTabItems({
    tabs,
    view,
    activeCaseId,
    handleSelect,
    handleClose,
}: {
    tabs: CaseTabBarTab[];
    view: 'editor' | 'history' | 'history-detail';
    activeCaseId: string | null;
    handleSelect: (projectIndex: number, caseIndex: number, caseId: string) => void;
    handleClose: (caseId: string) => void;
}) {
    return tabs.map(({ caseId, location, caseItem, label }) => ({
        key: caseId,
        label,
        active: view === 'editor' && caseId === activeCaseId,
        icon: caseItem.favorite ? <StarFilled className="case-tab-favorite-icon" /> : undefined,
        onSelect: () => handleSelect(location.projectIndex, location.caseIndex, caseId),
        onClose: () => handleClose(caseId),
    }));
}

function buildHistoryTabItems({
    historyOpen,
    view,
    openHistory,
    closeHistory,
    detailId,
    detailLabel,
    openHistoryDetail,
    closeHistoryDetail,
}: {
    historyOpen: boolean;
    view: 'editor' | 'history' | 'history-detail';
    openHistory: () => void;
    closeHistory: () => void;
    detailId?: string;
    detailLabel: string;
    openHistoryDetail: (entryId: string) => void;
    closeHistoryDetail: () => void;
}) {
    const items: TitleBarTabItem[] = [];

    if (historyOpen) {
        items.push({
            key: 'request-history',
            label: '请求历史',
            active: view === 'history',
            onSelect: openHistory,
            onClose: closeHistory,
        });
    }

    if (detailId) {
        items.push({
            key: `request-history-detail:${detailId}`,
            label: detailLabel,
            leadingIcon: <HistoryOutlined />,
            active: view === 'history-detail',
            onSelect: () => {
                if (detailId) openHistoryDetail(detailId);
            },
            onClose: closeHistoryDetail,
        });
    }

    return items;
}

function CaseTabBar({ variant = 'default' }: CaseTabBarProps) {
    const { runningCaseId, cancel } = useKcbpCall();
    const { projects, activeProjectIndex, activeCaseIndex, openCaseIds } = useTabsNavigation();
    const { selectCase, closeCaseTab } = useTabsActions();
    const { entries } = useRequestHistoryState();
    const {
        view,
        historyOpen,
        detailId,
        openHistory,
        closeHistory,
        openHistoryDetail,
        closeHistoryDetail,
        showEditor,
    } = useRequestHistoryNavigation();

    const activeCaseId = projects[activeProjectIndex]?.cases[activeCaseIndex]?.id ?? null;

    const handleSelect = useCallback(
        (projectIndex: number, caseIndex: number, caseId: string) => {
            if (caseId === activeCaseId && view === 'editor') return;
            showEditor();
            selectCase(projectIndex, caseIndex);
        },
        [activeCaseId, selectCase, showEditor, view],
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

    const tabs = useMemo(() => getOpenCaseTabs(projects, openCaseIds), [openCaseIds, projects]);

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

    const items = useMemo(() => {
        const detailEntry = detailId ? entries.find((entry) => entry.id === detailId) : undefined;

        return [
            ...buildCaseTabItems({
                tabs,
                view,
                activeCaseId,
                handleSelect,
                handleClose,
            }),
            ...buildHistoryTabItems({
                historyOpen,
                view,
                openHistory,
                closeHistory,
                detailId,
                detailLabel: detailEntry?.caseName ?? '详情',
                openHistoryDetail,
                closeHistoryDetail,
            }),
        ];
    }, [
        activeCaseId,
        closeHistory,
        closeHistoryDetail,
        detailId,
        entries,
        handleClose,
        handleSelect,
        historyOpen,
        openHistory,
        openHistoryDetail,
        tabs,
        view,
    ]);

    return (
        <TitleBarTabBar
            items={items}
            variant={variant}
            onCloseOthers={openCaseIds.length > 1 ? handleCloseOthers : undefined}
        />
    );
}

export default memo(CaseTabBar);
