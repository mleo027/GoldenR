export function formatDateTime(timestamp: number): string {
    const date = new Date(timestamp);
    const pad = (value: number) => String(value).padStart(2, '0');

    return [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())]
        .join('-')
        .concat(` ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`);
}

const BEIJING_PARTS_FORMATTER = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
});

function partValue(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
    return parts.find((item) => item.type === type)?.value ?? '';
}

/** 将 ISO 时间格式化为北京时间 YYYY-MM-DD HH:mm:ss */
export function formatIsoDateTimeBeijing(iso?: string | null): string {
    if (!iso) return '—';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;

    const parts = BEIJING_PARTS_FORMATTER.formatToParts(date);
    return `${partValue(parts, 'year')}-${partValue(parts, 'month')}-${partValue(parts, 'day')} ${partValue(parts, 'hour')}:${partValue(parts, 'minute')}:${partValue(parts, 'second')}`;
}

/** 相对时间（北京时间 ISO 输入），用于监控页「最近轮询」等 */
export function formatRelativeTimeBeijing(iso?: string | null): string {
    if (!iso) return '—';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;

    const diffMs = Date.now() - date.getTime();
    if (diffMs < 0) return formatIsoDateTimeBeijing(iso);

    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 60) return '刚刚';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} 分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小时前`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} 天前`;
    return formatIsoDateTimeBeijing(iso);
}
