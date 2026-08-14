import { useMemo } from 'react';
import { Modal, Typography } from 'antd';
import { ControlCharText } from '../../utils/ControlCharText';

interface RowDetailModalProps {
    open: boolean;
    rowIndex?: number;
    record?: Record<string, unknown>;
    onClose: () => void;
}

function formatValue(value: unknown): string {
    if (value == null) return '';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
}

export default function RowDetailModal({ open, rowIndex, record, onClose }: RowDetailModalProps) {
    const entries = useMemo(() => {
        if (!record) return [];
        return Object.entries(record).filter(([key]) => key !== 'key');
    }, [record]);

    const title =
        rowIndex != null
            ? `记录详情 #${rowIndex}${entries.length > 0 ? ` · ${entries.length} 字段` : ''}`
            : '记录详情';

    return (
        <Modal
            title={title}
            open={open}
            onCancel={onClose}
            footer={null}
            width={680}
            centered
            destroyOnClose
            className="app-modal row-detail-modal"
            styles={{
                body: {
                    maxHeight: 'calc(100vh - 180px)',
                    overflowY: 'auto',
                    paddingTop: 12,
                    paddingBottom: 12,
                },
            }}
        >
            {entries.length === 0 ? (
                <Typography.Text type="secondary">暂无字段数据</Typography.Text>
            ) : (
                <div className="row-detail-list">
                    {entries.map(([field, value]) => {
                        const text = formatValue(value);
                        return (
                            <div key={field} className="row-detail-item">
                                <div className="row-detail-field">{field}</div>
                                <div className="row-detail-value">
                                    {text ? <ControlCharText text={text} /> : '—'}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </Modal>
    );
}
