import { Skeleton } from 'antd';

export type ModuleLayoutSkeletonVariant = 'sidebar-main' | 'full';

interface ModuleLayoutSkeletonProps {
    variant?: ModuleLayoutSkeletonVariant;
}

function SkeletonBlock({ width, height }: { width?: number | string; height?: number }) {
    return (
        <Skeleton.Input
            active
            size="small"
            className="module-skeleton-cell"
            style={{ width, height: height ?? 14 }}
        />
    );
}

export default function ModuleLayoutSkeleton({
    variant = 'sidebar-main',
}: ModuleLayoutSkeletonProps) {
    if (variant === 'full') {
        return (
            <div className="module-layout-skeleton module-layout-skeleton--full">
                <div className="module-skeleton-toolbar">
                    <SkeletonBlock width="28%" />
                    <SkeletonBlock width="18%" />
                </div>
                <div className="module-skeleton-body">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <SkeletonBlock key={index} width={`${70 - index * 6}%`} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="module-layout-skeleton module-layout-skeleton--sidebar-main">
            <div className="module-skeleton-sidebar">
                <SkeletonBlock width="72%" height={16} />
                {Array.from({ length: 5 }).map((_, index) => (
                    <SkeletonBlock key={index} width={`${85 - index * 8}%`} />
                ))}
            </div>
            <div className="module-skeleton-main">
                <div className="module-skeleton-toolbar">
                    <SkeletonBlock width="32%" />
                    <SkeletonBlock width="20%" />
                </div>
                <div className="module-skeleton-body">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <SkeletonBlock key={index} width={`${90 - index * 10}%`} />
                    ))}
                </div>
            </div>
        </div>
    );
}
