import { Button, ColorPicker, Switch, Typography } from 'antd';
import type { Color } from 'antd/es/color-picker';
import { useAppEnv } from '../../../store/useAppEnv';

export default function AppearanceSettings() {
    const { env, updateEnv } = useAppEnv();
    const { compactMode, showRowIndex, darkMode, accentColor } = env;
    const defaultAccent = darkMode ? '#2DA44E' : '#7C3AED';
    const selectedAccent = accentColor || defaultAccent;
    const presets = ['#7C3AED', '#2563EB', '#0891B2', '#0F766E', '#2DA44E', '#D97706', '#E11D48'];

    return (
        <div className="settings-panel">
            <Typography.Title level={5} className="settings-panel-title">
                外观
            </Typography.Title>
            <Typography.Paragraph className="settings-panel-desc">
                调整界面显示与交互偏好
            </Typography.Paragraph>
            <div className="settings-panel-group settings-toggle-group">
                <div className="settings-panel-row settings-panel-row--stacked">
                    <div className="settings-panel-row-copy">
                        <div className="settings-panel-row-label">主题色</div>
                        <div className="settings-panel-row-hint">
                            调整按钮、选中项和交互高亮颜色
                        </div>
                    </div>
                    <div className="appearance-accent-picker">
                        <div
                            className="appearance-accent-presets"
                            role="list"
                            aria-label="主题色预设"
                        >
                            {presets.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    className={`appearance-accent-swatch${selectedAccent.toUpperCase() === color ? ' is-selected' : ''}`}
                                    style={{ backgroundColor: color }}
                                    aria-label={`选择主题色 ${color}`}
                                    onClick={() => updateEnv('accentColor', color)}
                                />
                            ))}
                        </div>
                        <ColorPicker
                            value={selectedAccent}
                            showText
                            onChange={(color: Color) =>
                                updateEnv('accentColor', color.toHexString())
                            }
                        />
                        {accentColor ? (
                            <Button
                                type="link"
                                size="small"
                                onClick={() => updateEnv('accentColor', undefined)}
                            >
                                恢复默认
                            </Button>
                        ) : null}
                    </div>
                </div>
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
