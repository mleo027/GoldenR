import { Tooltip } from 'antd';
import { SearchOutlined, SettingOutlined } from '@ant-design/icons';
import { useAppEnv } from '../../store/useAppEnv';
import type { AppModuleDefinition } from '../registry/types';
import { usePlatformShell } from './usePlatformShell';
import { useSettingsModal } from './useSettingsModal';
import { modKeyLabel } from './platformCommandItems';

interface ActivityBarProps {
    modules: AppModuleDefinition[];
    onOpenCommandPalette: () => void;
}

export default function ActivityBar({ modules, onOpenCommandPalette }: ActivityBarProps) {
    const { env, updateEnv } = useAppEnv();
    const { sidebarVisible, setSidebarVisible, toggleSidebar } = usePlatformShell();
    const { open, openSettings } = useSettingsModal();

    const handleModuleClick = (moduleId: string) => {
        if (moduleId === env.activeModuleId) {
            toggleSidebar();
            return;
        }

        updateEnv('activeModuleId', moduleId);
        if (!sidebarVisible) {
            setSidebarVisible(true);
        }
    };

    return (
        <nav className="activity-bar" aria-label="应用导航">
            <div className="activity-bar-scroll">
                {modules.map((module) => {
                    const active = env.activeModuleId === module.id;
                    return (
                        <Tooltip key={module.id} title={module.label} placement="right">
                            <button
                                type="button"
                                className={`activity-bar-item${active ? ' activity-bar-item-active' : ''}`}
                                aria-label={module.label}
                                aria-current={active ? 'page' : undefined}
                                aria-pressed={active && sidebarVisible}
                                onClick={() => handleModuleClick(module.id)}
                            >
                                <span className="activity-bar-icon">{module.icon}</span>
                            </button>
                        </Tooltip>
                    );
                })}
            </div>
            <div className="activity-bar-footer">
                <Tooltip title={`命令面板 (${modKeyLabel()}⇧P)`} placement="right">
                    <button
                        type="button"
                        className="activity-bar-item activity-bar-item-command"
                        aria-label="打开命令面板"
                        onClick={onOpenCommandPalette}
                    >
                        <span className="activity-bar-icon">
                            <SearchOutlined />
                        </span>
                    </button>
                </Tooltip>
                <Tooltip title="设置 (Ctrl+,)" placement="right" open={open ? false : undefined}>
                    <button
                        type="button"
                        className={`activity-bar-item activity-bar-item-settings${open ? ' activity-bar-item-active' : ''}`}
                        aria-label="设置"
                        aria-pressed={open}
                        onClick={() => openSettings()}
                    >
                        <span className="activity-bar-icon">
                            <SettingOutlined />
                        </span>
                    </button>
                </Tooltip>
            </div>
        </nav>
    );
}
