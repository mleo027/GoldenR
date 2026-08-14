import { Skeleton } from 'antd';

const SKELETON_ROWS = 10;

export default function ResponseTableSkeleton() {
    return (
        <div className="response-table-skeleton" aria-hidden>
            <div className="response-table-skeleton-header">
                {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton.Input
                        key={index}
                        active
                        size="small"
                        className="response-table-skeleton-cell"
                    />
                ))}
            </div>
            {Array.from({ length: SKELETON_ROWS }).map((_, rowIndex) => (
                <div key={rowIndex} className="response-table-skeleton-row">
                    {Array.from({ length: 5 }).map((_, colIndex) => (
                        <Skeleton.Input
                            key={colIndex}
                            active
                            size="small"
                            className="response-table-skeleton-cell"
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}
