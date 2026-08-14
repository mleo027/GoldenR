import { memo } from 'react';
import { CaretDownOutlined, CaretRightOutlined } from '@ant-design/icons';

interface CaseMsgtypeGroupHeaderProps {
    label: string;
    title: string;
    count: number;
    expanded: boolean;
    onToggle: () => void;
}

function CaseMsgtypeGroupHeader({
    label,
    title,
    count,
    expanded,
    onToggle,
}: CaseMsgtypeGroupHeaderProps) {
    return (
        <button type="button" className="case-msgtype-group" title={title} onClick={onToggle}>
            <span className="case-msgtype-group-caret">
                {expanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
            </span>
            <span className="case-msgtype-group-label">{label}</span>
            <span className="case-msgtype-group-count">{count}</span>
        </button>
    );
}

export default memo(CaseMsgtypeGroupHeader);
