import { forwardRef } from 'react';
import { Button as AntButton } from 'antd';
import type { ButtonProps as AntButtonProps } from 'antd';
import type { ButtonVariant, PrimitiveSize } from './types';

export type ButtonProps = Omit<AntButtonProps, 'type' | 'size' | 'danger' | 'variant'> & {
    variant?: ButtonVariant;
    size?: PrimitiveSize;
};

const VARIANT_TO_ANT: Record<ButtonVariant, Pick<AntButtonProps, 'type' | 'danger'>> = {
    primary: { type: 'primary' },
    secondary: { type: 'default' },
    ghost: { type: 'text' },
    danger: { type: 'default', danger: true },
    link: { type: 'link' },
    dangerGhost: { type: 'text', danger: true },
};

const SIZE_TO_ANT: Record<PrimitiveSize, AntButtonProps['size']> = {
    sm: 'small',
    md: 'middle',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    { variant = 'secondary', size = 'md', className, ...rest },
    ref,
) {
    const antVariant = VARIANT_TO_ANT[variant];
    const classes = ['ga-btn', `ga-btn--${variant}`, `ga-btn--${size}`, className]
        .filter(Boolean)
        .join(' ');

    return (
        <AntButton
            {...rest}
            {...antVariant}
            ref={ref}
            size={SIZE_TO_ANT[size]}
            className={classes}
        />
    );
});

export default Button;
