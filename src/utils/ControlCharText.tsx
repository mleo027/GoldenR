import { Fragment } from 'react';
import { Tooltip } from 'antd';
import { SOH_CHAR, containsSoh, formatControlCharsForTitle } from './controlCharDisplay';

interface ControlCharTextProps {
    text: string;
    className?: string;
}

/** 将 FIX 等协议中的 SOH 分隔符渲染为可见小方块 */
export function ControlCharText({ text, className }: ControlCharTextProps) {
    if (!containsSoh(text)) {
        return (
            <Tooltip title={formatControlCharsForTitle(text)}>
                <span className={className}>{formatControlCharsForTitle(text)}</span>
            </Tooltip>
        );
    }

    const parts = text.split(SOH_CHAR);
    const title = formatControlCharsForTitle(text);

    return (
        <Tooltip title={title}>
            <span className={className}>
                {parts.map((part, index) => (
                    <Fragment key={index}>
                        {index > 0 ? (
                            <Tooltip key={`soh-${index}`} title="SOH (Start of Heading, U+0001)">
                                <span className="ctrl-char ctrl-char-soh" aria-hidden>
                                    □
                                </span>
                            </Tooltip>
                        ) : null}
                        {formatControlCharsForTitle(part)}
                    </Fragment>
                ))}
            </span>
        </Tooltip>
    );
}
