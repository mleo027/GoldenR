import { Switch, Typography } from 'antd';
import { useAppEnv } from '../../../store/useAppEnv';

export default function AppearanceSettings() {
    const { env, updateEnv } = useAppEnv();
    const { compactMode, showRowIndex, darkMode } = env;

    return (
        <div className="settings-panel">
            <Typography.Title level={5} className="settings-panel-title">
                外观
            </Typography.Title>
            <Typography.Paragraph className="settings-panel-desc">
                调整界面显示与交互偏好
            </Typography.Paragraph>
            <div className="settings-panel-group settings-toggle-group">
                <div className="settings-panel-row">
                    <div className="settings-panel-row-copy">
                        <div className="settings-panel-row-label">深色模式</div>
                        <div className="settings-panel-row-hint">降低长时间使用的视觉疲劳</div>
                    </div>
                    <Switch
                        className="settings-switch"
                        size="small"
                        checked={darkMode}
                        onChange={(checked) => updateEnv('darkMode', checked)}
                    />
                </div>
                <div className="settings-panel-row">
                    <div className="settings-panel-row-copy">
                        <div className="settings-panel-row-label">紧凑模式</div>
                        <div className="settings-panel-row-hint">缩小间距，显示更多内容</div>
                    </div>
                    <Switch
                        className="settings-switch"
                        size="small"
                        checked={compactMode}
                        onChange={(checked) => updateEnv('compactMode', checked)}
                    />
                </div>
                <div className="settings-panel-row">
                    <div className="settings-panel-row-copy">
                        <div className="settings-panel-row-label">显示行号</div>
                        <div className="settings-panel-row-hint">响应表格左侧显示行序号</div>
                    </div>
                    <Switch
                        className="settings-switch"
                        size="small"
                        checked={showRowIndex}
                        onChange={(checked) => updateEnv('showRowIndex', checked)}
                    />
                </div>
            </div>
        </div>
    );
}
