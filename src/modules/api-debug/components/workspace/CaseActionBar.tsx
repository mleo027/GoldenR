import { Button, Tooltip } from 'antd';
import { FolderAddOutlined, HistoryOutlined, SettingOutlined } from '@ant-design/icons';
import { useSettingsModal } from '../../../../platform/shell/useSettingsModal';

interface CaseActionBarProps {
    onAddProject: () => void;
    onOpenHistory: () => void;
}

export default function CaseActionBar({ onAddProject, onOpenHistory }: CaseActionBarProps) {
    const { openSettings } = useSettingsModal();
    return (
        <div className="case-sidebar-actionbar px-3 py-1.5 flex items-center gap-1 border-b border-[var(--color-divider)]">
            <Tooltip title="新建项目">
                <Button
                    type="text"
                    size="small"
                    icon={<FolderAddOutlined />}
                    onClick={onAddProject}
                    className="case-actionbar-btn"
                    aria-label="新建项目"
                />
            </Tooltip>
            <Tooltip title="请求历史">
                <Button
                    type="text"
                    size="small"
                    icon={<HistoryOutlined />}
                    onClick={onOpenHistory}
                    className="case-actionbar-btn"
                    aria-label="请求历史"
                />
            </Tooltip>
            <Tooltip title="公共参数">
                <Button
                    type="text"
                    size="small"
                    icon={<SettingOutlined />}
                    onClick={() => openSettings('api-common-params')}
                    className="case-actionbar-btn"
                    aria-label="公共参数"
                />
            </Tooltip>
        </div>
    );
}
