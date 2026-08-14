/** 功能号前缀 → 业务模块名（4 位分组，常见于 410xxx 清算/交易系列） */
export const MSGTYPE_GROUP_LABELS: Record<string, string> = {
    '4101': '外围主题',
    '4102': '证券信息',
    '4103': '账户管理',
    '4104': '资金业务',
    '4105': '股份业务',
    '4106': '查询统计',
    '4107': '清算交收',
    '4108': '风控合规',
    '4109': '参数配置',
    '4110': '报表导出',
    '1505': '交易委托',
    '1506': '成交回报',
};

export function getMsgtypeGroupLabel(groupKey: string): string {
    if (groupKey === 'other') return '未分类';
    const alias = MSGTYPE_GROUP_LABELS[groupKey];
    return alias ? `${groupKey} · ${alias}` : groupKey;
}

export function getMsgtypeGroupTitle(groupKey: string): string {
    if (groupKey === 'other') return '未配置功能号的接口';
    const alias = MSGTYPE_GROUP_LABELS[groupKey];
    if (!alias) return `功能号前缀 ${groupKey}`;
    return `${groupKey} — ${alias}`;
}
