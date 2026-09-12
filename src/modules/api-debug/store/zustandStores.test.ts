import { beforeEach, describe, expect, it } from 'vitest';
import { useCommonParamsStore } from './commonParamsStore';
import { useRequestHistoryNavigationStore } from './requestHistoryNavigationStore';
import { useResponseStore } from './responseStore';
import { useRunLogStore } from './runLogStore';
import { useScriptConsoleStore } from './scriptConsoleStore';

beforeEach(() => {
    useCommonParamsStore.setState({ sets: [], loaded: false });
    useRequestHistoryNavigationStore.setState({
        view: 'editor',
        historyOpen: false,
        detailId: undefined,
        traceData: null,
        traceCaseName: '',
        traceReturn: null,
    });
    useResponseStore.setState({ responses: {}, order: [] });
    useRunLogStore.setState({ logs: [] });
    useScriptConsoleStore.setState({ consoles: {}, order: [] });
});

describe('Zustand runtime stores', () => {
    it('updates and trims response cache while allowing case cleanup', () => {
        for (let index = 0; index < 21; index += 1) {
            useResponseStore.getState().setResponse(`case-${index}`, {
                code: '0',
                message: 'ok',
                resultSets: [],
            });
        }

        expect(useResponseStore.getState().responses['case-0']).toBeUndefined();
        expect(useResponseStore.getState().responses['case-1']).toBeDefined();
        useResponseStore.getState().clearResponse('case-1');
        expect(useResponseStore.getState().responses['case-1']).toBeUndefined();
    });

    it('updates and clears script console cache by case', () => {
        const snapshot = { entries: [], ranAt: Date.now() };
        useScriptConsoleStore.getState().setScriptConsole('case-1', snapshot);
        expect(useScriptConsoleStore.getState().consoles['case-1']).toEqual(snapshot);
        useScriptConsoleStore.getState().clearScriptConsole('case-1');
        expect(useScriptConsoleStore.getState().consoles['case-1']).toBeUndefined();
    });

    it('limits run logs and creates unique entry ids', () => {
        for (let index = 0; index < 51; index += 1) {
            useRunLogStore.getState().pushLog({
                caseName: 'case',
                msgtype: String(index),
                success: true,
                message: 'ok',
                timestamp: index,
            });
        }

        const logs = useRunLogStore.getState().logs;
        expect(logs).toHaveLength(50);
        expect(logs[0].id).toBeTruthy();
        expect(new Set(logs.map((log) => log.id)).size).toBe(50);
        useRunLogStore.getState().clearLogs();
        expect(useRunLogStore.getState().logs).toEqual([]);
    });

    it('transitions request history navigation consistently', () => {
        const navigation = useRequestHistoryNavigationStore.getState();
        navigation.openHistory();
        expect(useRequestHistoryNavigationStore.getState()).toMatchObject({
            view: 'history',
            historyOpen: true,
        });
        navigation.openHistoryDetail('entry-1');
        expect(useRequestHistoryNavigationStore.getState().detailId).toBe('entry-1');
        navigation.closeAllHistory();
        expect(useRequestHistoryNavigationStore.getState().view).toBe('editor');
    });

    it('returns to the editor after closing a trace opened from the editor', () => {
        const navigation = useRequestHistoryNavigationStore.getState();
        navigation.openTrace({ enabled: true, events: [] }, 'Case 1');
        expect(useRequestHistoryNavigationStore.getState().view).toBe('trace');

        navigation.closeTrace();

        expect(useRequestHistoryNavigationStore.getState()).toMatchObject({
            view: 'editor',
            historyOpen: false,
            traceData: null,
        });
    });

    it('returns to the history detail after closing a trace opened from history', () => {
        const navigation = useRequestHistoryNavigationStore.getState();
        navigation.openHistoryDetail('entry-1');
        navigation.openTrace({ enabled: true, events: [] }, 'Case 1');

        navigation.closeTrace();

        expect(useRequestHistoryNavigationStore.getState()).toMatchObject({
            view: 'history-detail',
            historyOpen: true,
            detailId: 'entry-1',
        });
    });

    it('updates common parameter sets through store actions', () => {
        const set = useCommonParamsStore.getState().addSet('Defaults');
        expect(useCommonParamsStore.getState().sets).toHaveLength(1);
        useCommonParamsStore.getState().renameSet(set.id, 'Renamed');
        expect(useCommonParamsStore.getState().sets[0].name).toBe('Renamed');
        useCommonParamsStore.getState().deleteSet(set.id);
        expect(useCommonParamsStore.getState().sets).toEqual([]);
    });
});
