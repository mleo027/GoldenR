import { Drawer as AntDrawer } from 'antd';
import type { DrawerProps as AntDrawerProps } from 'antd';
import type { ReactNode } from 'react';
import type { DrawerWidth } from './types';
import { DRAWER_WIDTHS, resolveWidth } from './types';

export type DrawerProps = Omit<AntDrawerProps, 'width' | 'placement' | 'destroyOnClose'> & {
    width?: DrawerWidth;
    description?: ReactNode;
};

export default function Drawer({
    width = 'md',
    description,
    title,
    className,
    ...rest
}: DrawerProps) {
    const classes = ['ga-drawer', className].filter(Boolean).join(' ');
    const resolvedTitle =
        description != null ? (
            <div>
                <div>{title}</div>
                <div className="ga-drawer__desc">{description}</div>
            </div>
        ) : (
            title
        );

    return (
        <AntDrawer
            {...rest}
            title={resolvedTitle}
            placement="right"
            destroyOnClose
            width={resolveWidth(width, DRAWER_WIDTHS, DRAWER_WIDTHS.md)}
            className={classes}
        />
    );
}
