import type { ThHTMLAttributes } from 'react';

export interface ResizableHeaderCellProps extends ThHTMLAttributes<HTMLTableCellElement> {
    width?: number;
    onResize?: (width: number) => void;
    minWidth?: number;
}

const DEFAULT_MIN_WIDTH = 60;

export default function ResizableHeaderCell({
    width,
    onResize,
    minWidth = DEFAULT_MIN_WIDTH,
    style,
    ...restProps
}: ResizableHeaderCellProps) {
    if (!width || !onResize) {
        return <th {...restProps} style={style} />;
    }

    return (
        <th {...restProps} style={{ ...style, width, position: 'relative' }}>
            {restProps.children}
            <span
                className="col-resizer"
                onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();

                    const startX = event.clientX;
                    const startWidth = width;

                    const handleMouseMove = (moveEvent: MouseEvent) => {
                        onResize(Math.max(minWidth, startWidth + moveEvent.clientX - startX));
                    };

                    const handleMouseUp = () => {
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                        document.body.classList.remove('col-resizing');
                    };

                    document.body.classList.add('col-resizing');
                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                }}
            />
        </th>
    );
}
