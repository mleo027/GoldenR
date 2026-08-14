import { Skeleton } from 'antd';

export default function SettingsModalSkeleton() {
    return (
        <div className="settings-modal-skeleton">
            <div className="settings-modal-skeleton-nav">
                {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton.Input
                        key={index}
                        active
                        size="small"
                        className="module-skeleton-cell"
                        style={{ width: `${80 - index * 6}%`, height: 14 }}
                    />
                ))}
            </div>
            <div className="settings-modal-skeleton-content">
                <Skeleton.Input active size="small" style={{ width: '40%', height: 18 }} />
                <Skeleton.Input active size="small" style={{ width: '100%', height: 14 }} />
                <Skeleton.Input active size="small" style={{ width: '92%', height: 14 }} />
                <Skeleton.Input active size="small" style={{ width: '88%', height: 14 }} />
            </div>
        </div>
    );
}
