/** 平台级快捷键约定：Mod = Ctrl（Windows）/ Cmd（macOS） */
export const PLATFORM_SHORTCUT = {
    /** 模块主快捷操作（侧栏搜索 / 命令面板等） */
    QUICK_OPEN: { shortcutKey: 'k', mod: true },
    /** 平台命令面板（切换模块 / 快捷命令） */
    COMMAND_PALETTE: { shortcutKey: 'p', mod: true, shift: true },
    /** 打开设置 */
    OPEN_SETTINGS: { shortcutKey: ',', mod: true },
    /** API 调试：执行请求 */
    RUN: { shortcutKey: 'Enter', mod: true },
    /** 编辑器：保存 */
    SAVE: { shortcutKey: 's', mod: true },
    /** 撤销 / 重做 */
    UNDO: { shortcutKey: 'z', mod: true },
    REDO: { shortcutKey: 'z', mod: true, shift: true },
} as const;
