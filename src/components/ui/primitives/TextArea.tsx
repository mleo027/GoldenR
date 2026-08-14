import { Input } from 'antd';
import type { TextAreaProps as AntTextAreaProps, TextAreaRef } from 'antd/es/input/TextArea';
import { forwardRef } from 'react';

export type TextAreaProps = AntTextAreaProps;

const TextAreaInner = forwardRef<TextAreaRef, TextAreaProps>(function TextArea(
    { className, ...rest },
    ref,
) {
    const classes = ['ga-textarea', className].filter(Boolean).join(' ');

    return <Input.TextArea ref={ref} {...rest} className={classes} />;
});

export default TextAreaInner;
