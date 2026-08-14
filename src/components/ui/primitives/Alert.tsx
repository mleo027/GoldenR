import { Alert as AntAlert } from 'antd';
import type { AlertProps as AntAlertProps } from 'antd';
import type { AlertVariant } from './types';

export type AlertProps = Omit<AntAlertProps, 'type'> & {
    variant?: AlertVariant;
};

const VARIANT_TO_TYPE: Record<AlertVariant, AntAlertProps['type']> = {
    info: 'info',
    success: 'success',
    warning: 'warning',
    error: 'error',
    callout: 'info',
};

export default function Alert({
    variant = 'info',
    className,
    showIcon = true,
    ...rest
}: AlertProps) {
    const classes = ['ga-alert', variant === 'callout' ? 'ga-alert--callout' : '', className]
        .filter(Boolean)
        .join(' ');

    return (
        <AntAlert
            {...rest}
            type={VARIANT_TO_TYPE[variant]}
            className={classes}
            showIcon={showIcon}
        />
    );
}
