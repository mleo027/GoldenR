import { Typography } from 'antd';
import GoldenApiLogo from '../../ui/GoldenApiLogo';
import { PLATFORM_SHORTCUT } from '@/platform/shell/platformShortcuts';
import { modKeyLabel } from '@/platform/shell/platformCommandItems';

function formatShortcut(def: { shortcutKey: string; mod?: boolean; shift?: boolean }): string {
    const mod = modKeyLabel();
    const parts: string[] = [];
    if (def.mod) parts.push(mod);
    if (def.shift) parts.push('Shift');
    parts.push(def.shortcutKey === ',' ? ',' : def.shortcutKey);
    return parts.join('+');
}

const SHORTCUT_ROWS: { label: string; shortcut: string }[] = [
    { label: '命令面板', shortcut: formatShortcut(PLATFORM_SHORTCUT.COMMAND_PALETTE) },
    { label: '打开设置', shortcut: formatShortcut(PLATFORM_SHORTCUT.OPEN_SETTINGS) },
    { label: 'API 调试 · 执行请求', shortcut: formatShortcut(PLATFORM_SHORTCUT.RUN) },
    { label: '撤销', shortcut: formatShortcut(PLATFORM_SHORTCUT.UNDO) },
    { label: '重做', shortcut: formatShortcut(PLATFORM_SHORTCUT.REDO) },
    { label: '编辑器 · 保存', shortcut: formatShortcut(PLATFORM_SHORTCUT.SAVE) },
];

export default function AboutSettings() {
    return (
        <div className="settings-panel">
            <Typography.Title level={5} className="settings-panel-title">
                关于
            </Typography.Title>
            <Typography.Paragraph className="settings-panel-desc">
                Golden API — 独立 API 调试工具
            </Typography.Paragraph>
            <div className="settings-about-card">
                <GoldenApiLogo size={52} className="settings-about-logo" title="Golden API" />
                <div className="settings-about-meta">
                    <div className="settings-about-name">Golden API</div>
                    <div className="settings-about-tagline">KCBP 接口调试</div>
                    <div className="settings-about-version">版本 v0.1.0</div>
                    <div className="settings-about-contact">
                        开发者联系：
                        <Typography.Link href="mailto:meilingfeng@szkingdom.com">
                            meilingfeng@szkingdom.com
                        </Typography.Link>
                    </div>
                </div>
            </div>

            <Typography.Title
                level={5}
                className="settings-panel-title settings-about-shortcuts-title"
            >
                快捷键
            </Typography.Title>
            <div className="settings-about-shortcuts">
                {SHORTCUT_ROWS.map((row) => (
                    <div key={row.label} className="settings-about-shortcut-row">
                        <span className="settings-about-shortcut-label">{row.label}</span>
                        <kbd className="settings-about-shortcut-key">{row.shortcut}</kbd>
                    </div>
                ))}
            </div>
        </div>
    );
}
