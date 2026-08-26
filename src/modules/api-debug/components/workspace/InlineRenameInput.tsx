import type { RefObject } from 'react';
import { Input } from '../../../../components/ui/primitives';
import type { InputRef } from '../../../../components/ui/primitives';

interface InlineRenameInputProps {
    inputRef: RefObject<InputRef | null>;
    value: string;
    onChange: (value: string) => void;
    onFinish: () => void;
    onClick?: (event: React.MouseEvent) => void;
}

export default function InlineRenameInput({
    inputRef,
    value,
    onChange,
    onFinish,
    onClick,
}: InlineRenameInputProps) {
    return (
        <Input
            ref={inputRef as React.Ref<InputRef>}
            size="sm"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onPressEnter={onFinish}
            onBlur={onFinish}
            onClick={onClick}
            className="case-item-input"
        />
    );
}
