import { Input as AntInput } from 'antd';
import type { InputProps as AntInputProps, InputRef } from 'antd';
import { forwardRef } from 'react';
import type { PrimitiveSize } from './types';

export type { InputRef };
export type InputProps = Omit<AntInputProps, 'size'> & {
    size?: PrimitiveSize;
};

const InputInner = forwardRef<InputRef, InputProps>(function Input(
    { size = 'md', className, ...rest },
    ref,
) {
    const classes = ['ga-input', `ga-input--${size}`, className].filter(Boolean).join(' ');

    return <AntInput ref={ref} {...rest} className={classes} />;
});

export default InputInner;
