import { Empty } from 'antd';
import HistoryDetail from './HistoryDetail';
import { useRequestHistoryActions, useRequestHistoryState } from '../../store/useRequestHistory';
import { useRequestHistoryNavigation } from '../../store/useRequestHistoryNavigation';
import { useHistoryActions } from './useHistoryActions';

export default function HistoryDetailTab({ entryId }: { entryId: string }) {
    const { entries, loaded } = useRequestHistoryState();
    const { deleteEntry } = useRequestHistoryActions();
    const { closeHistory, closeHistoryDetail } = useRequestHistoryNavigation();
    const returnToEditor = () => {
        closeHistoryDetail();
        closeHistory();
    };
    const { loadEntry, handleReplay, handleCopy } = useHistoryActions(returnToEditor);

    if (!loaded) {
        return <div className="p-8 text-center text-[var(--color-text-muted)]">加载中...</div>;
    }

    const entry = entries.find((item) => item.id === entryId);
    if (!entry) {
        return <Empty description="历史记录不存在或已删除" />;
    }

    return (
        <div className="flex flex-col flex-1 h-full w-full overflow-hidden">
            <div className="ui-card ui-card--workspace h-full">
                <HistoryDetail
                    entry={entry}
                    onLoad={() => {
                        loadEntry(entry);
                        returnToEditor();
                    }}
                    onReplay={() => handleReplay(entry)}
                    onCopy={() => handleCopy(entry)}
                    onDelete={() => {
                        deleteEntry(entry.id);
                        closeHistoryDetail();
                    }}
                />
            </div>
        </div>
    );
}
