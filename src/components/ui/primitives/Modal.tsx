import { Modal as AntModal } from 'antd';
import type { ModalProps as AntModalProps } from 'antd';
import type { ModalWidth } from './types';
import { MODAL_WIDTHS, resolveWidth } from './types';

export type ModalProps = Omit<AntModalProps, 'width' | 'centered'> & {
    width?: ModalWidth;
};

export default function Modal({ width = 'md', className, ...rest }: ModalProps) {
    const classes = ['app-modal', 'ga-modal', className].filter(Boolean).join(' ');

    return (
        <AntModal
            {...rest}
            centered
            width={resolveWidth(width, MODAL_WIDTHS, MODAL_WIDTHS.md)}
            className={classes}
        />
    );
}
