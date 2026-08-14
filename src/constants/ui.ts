/** UI 交互防抖延迟（毫秒） */
export const UI_DEBOUNCE_MS = {
    search: 500,
    save: 500,
    edit: 400,
} as const;

/** 性能相关阈值：超过后启用对应优化策略 */
export const PERFORMANCE_THRESHOLDS = {
    /** 参数表启用 virtual 的行数 */
    paramVirtualRows: 50,
    /** 响应表视为大表的行数（全量 filter/sort 需注意） */
    largeResponseRows: 5000,
    /** 侧栏可见接口数启用虚拟列表 */
    sidebarVirtualCases: 200,
    /** 大表导出前提示的行数 */
    largeExportRows: 5000,
} as const;

/** 内容区与表格左右贴边留白 */
export const CONTENT_EDGE_INSET_PX = 10;

/** 布局最小宽度（防止拖拽分栏后 UI 挤压变形） */
export const LAYOUT_MIN_WIDTH_PX = {
    window: 1024,
    sidebar: 240,
    mainPanel: 680,
    pathBar: 640,
} as const;

/** 模块/子功能侧栏与主区默认宽度比 1:4（react-resizable-panels 百分比） */
export const MODULE_LAYOUT_SIDEBAR_RATIO = {
    defaultSize: 20,
    minSize: 14,
    maxSize: 40,
} as const;
