import { useMemo, useState } from 'react';
import { App, Button, Drawer, Space, Typography } from 'antd';
import { CopyOutlined, FormatPainterOutlined } from '@ant-design/icons';
import { formatExecutedSqlPreview, formatSqlPreview } from '../../utils/suggest/paramSuggestSql';

interface ParamSuggestSqlDrawerProps {
    open: boolean;
    sql: string;
    boundParams?: Record<string, string | number>;
    onClose: () => void;
}

export default function ParamSuggestSqlDrawer({
    open,
    sql,
    boundParams,
    onClose,
}: ParamSuggestSqlDrawerProps) {
    const { message } = App.useApp();
    const [formatted, setFormatted] = useState(false);

    const displaySql = useMemo(() => {
        const base = formatted ? formatSqlPreview(sql) : sql;
        return formatExecutedSqlPreview(base, boundParams);
    }, [sql, boundParams, formatted]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(displaySql);
            message.success('SQL 已复制');
        } catch {
            message.error('复制失败');
        }
    };

    return (
        <Drawer
            title="查看 SQL"
            open={open}
            width={520}
            className="param-suggest-sql-drawer"
            onClose={() => {
                setFormatted(false);
                onClose();
            }}
        >
            <Space className="mb-3">
                <Button size="small" icon={<CopyOutlined />} onClick={() => void handleCopy()}>
                    复制 SQL
                </Button>
                <Button
                    size="small"
                    icon={<FormatPainterOutlined />}
                    type={formatted ? 'primary' : 'default'}
                    onClick={() => setFormatted((value) => !value)}
                >
                    {formatted ? '原始 SQL' : '格式化'}
                </Button>
            </Space>
            <pre className="param-suggest-sql-drawer-content">{displaySql}</pre>
            {boundParams && Object.keys(boundParams).length > 0 ? (
                <Typography.Paragraph type="secondary" className="text-xs mt-3 mb-0">
                    参数已附在 SQL 预览末尾。
                </Typography.Paragraph>
            ) : null}
        </Drawer>
    );
}
