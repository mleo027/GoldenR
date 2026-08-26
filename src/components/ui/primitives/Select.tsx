import { CheckOutlined } from '@ant-design/icons';
import { Select as AntSelect } from 'antd';
import type { RefSelectProps, SelectProps as AntSelectProps } from 'antd';
import { forwardRef } from 'react';
import type { PrimitiveSize } from './types';

export type SelectProps = Omit<AntSelectProps, 'size'> & {
    size?: PrimitiveSize;
};

const SIZE_TO_ANT: Record<PrimitiveSize, AntSelectProps['size']> = {
    sm: 'small',
    md: 'middle',
};

function unwrapValue(item: unknown): unknown {
    if (item && typeof item === 'object' && 'value' in item) {
        return (item as { value: unknown }).value;
    }
    return item;
}

function isOptionSelected(optionValue: unknown, value: AntSelectProps['value']): boolean {
    if (value === undefined || value === null) return false;
    if (Array.isArray(value)) {
        return value.some((item) => unwrapValue(item) === optionValue);
    }
    return unwrapValue(value) === optionValue;
}

const SelectInner = forwardRef<RefSelectProps, SelectProps>(function Select(
    {
        size = 'md',
        className,
        popupClassName,
        placement = 'bottomLeft',
        popupMatchSelectWidth = true,
        showSearch = false,
        optionRender,
        ...rest
    },
    ref,
) {
    const classes = ['ga-select', `ga-select--${size}`, className].filter(Boolean).join(' ');
    const dropdownClasses = ['ga-select-dropdown', popupClassName].filter(Boolean).join(' ');

    return (
        <AntSelect
            ref={ref}
            {...rest}
            size={SIZE_TO_ANT[size]}
            className={classes}
            popupClassName={dropdownClasses}
            placement={placement}
            popupMatchSelectWidth={popupMatchSelectWidth}
            showSearch={showSearch}
            optionRender={
                optionRender ??
                ((option) => (
                    <span className="ga-select-option">
                        <span className="ga-select-option-label">{option.label}</span>
                        {isOptionSelected(option.value, rest.value) ? (
                            <CheckOutlined className="ga-select-option-check" />
                        ) : null}
                    </span>
                ))
            }
        />
    );
});

export default SelectInner;
