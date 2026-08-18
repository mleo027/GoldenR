import { Fragment } from 'react';
import { SOH_CHAR, containsSoh, formatControlCharsForTitle } from './controlCharDisplay';

interface ControlCharTextProps {
    text: string;
    className?: string;
}

/** 将 FIX 等协议中的 SOH 分隔符渲染为可见小方块 */
export function ControlCharText({ text, className }: ControlCharTextProps) {
    if (!containsSoh(text)) {
        return (
            <span className={className} title={formatControlCharsForTitle(text)}>
                {formatControlCharsForTitle(text)}
            </span>
        );
    }

    const parts = text.split(SOH_CHAR);
    const title = formatControlCharsForTitle(text);

    return (
        <span className={className} title={title}>
            {parts.map((part, index) => (
                <Fragment key={index}>
                    {index > 0 ? (
                        <span
                            className="ctrl-char ctrl-char-soh"
                            title="SOH (Start of Heading, U+0001)"
                            aria-hidden
                        >
                            □
                        </span>
                    ) : null}
                    {formatControlCharsForTitle(part)}
                </Fragment>
            ))}
        </span>
    );
}
