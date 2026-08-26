import { Input } from 'antd';
import type { InputProps, InputRef } from 'antd';
import { forwardRef } from 'react';

export type PasswordProps = InputProps;

const PasswordInner = forwardRef<InputRef, PasswordProps>(function Password(
    { className, ...rest },
    ref,
) {
    const classes = ['ga-input', 'ga-input--md', className].filter(Boolean).join(' ');

    return <Input.Password ref={ref} {...rest} className={classes} />;
});

export default PasswordInner;
