import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export const TITLE_BAR_SLOT_ID = 'title-bar-slot';

interface TitleBarSlotPortalProps {
    children: ReactNode;
}

export default function TitleBarSlotPortal({ children }: TitleBarSlotPortalProps) {
    const [container, setContainer] = useState<HTMLElement | null>(null);

    useEffect(() => {
        setContainer(document.getElementById(TITLE_BAR_SLOT_ID));
    }, []);

    if (!container) {
        return null;
    }

    return createPortal(children, container);
}
