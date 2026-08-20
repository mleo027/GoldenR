// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { scrollCaseIntoView } from './scrollCaseIntoView';

const CONTAINER_RECT = {
    top: 0,
    bottom: 100,
    left: 0,
    right: 100,
    width: 100,
    height: 100,
    x: 0,
    y: 0,
    toJSON: () => ({}),
} as DOMRect;

const IN_VIEW_RECT = {
    top: 20,
    bottom: 40,
    left: 0,
    right: 100,
    width: 100,
    height: 20,
    x: 0,
    y: 20,
    toJSON: () => ({}),
} as DOMRect;

const OUT_OF_VIEW_RECT = {
    top: 500,
    bottom: 520,
    left: 0,
    right: 100,
    width: 100,
    height: 20,
    x: 0,
    y: 500,
    toJSON: () => ({}),
} as DOMRect;

function mountChild(caseId: string): { root: HTMLElement; child: HTMLElement } {
    document.body.replaceChildren();
    const root = document.createElement('div');
    root.className = 'case-children';
    const child = document.createElement('div');
    child.setAttribute('data-case-id', caseId);
    root.appendChild(child);
    document.body.appendChild(root);
    return { root, child };
}

if (typeof HTMLElement.prototype.scrollIntoView !== 'function') {
    HTMLElement.prototype.scrollIntoView = () => {};
}

afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
});

describe('scrollCaseIntoView', () => {
    it('scrolls and focuses the node when it is outside the container viewport', () => {
        const { root, child } = mountChild('case-1');
        vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(CONTAINER_RECT);
        vi.spyOn(child, 'getBoundingClientRect').mockReturnValue(OUT_OF_VIEW_RECT);
        const scrollSpy = vi
            .spyOn(HTMLElement.prototype, 'scrollIntoView')
            .mockImplementation(() => {});
        const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(() => {});

        scrollCaseIntoView(root, 'case-1');

        expect(scrollSpy).toHaveBeenCalledWith({ block: 'nearest' });
        expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    });

    it('does nothing when the node is already inside the viewport', () => {
        const { root, child } = mountChild('case-1');
        vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(CONTAINER_RECT);
        vi.spyOn(child, 'getBoundingClientRect').mockReturnValue(IN_VIEW_RECT);
        const scrollSpy = vi
            .spyOn(HTMLElement.prototype, 'scrollIntoView')
            .mockImplementation(() => {});
        const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(() => {});

        scrollCaseIntoView(root, 'case-1');

        expect(scrollSpy).not.toHaveBeenCalled();
        expect(focusSpy).not.toHaveBeenCalled();
    });

    it('does nothing for an unknown case id', () => {
        const { root } = mountChild('case-1');
        vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(CONTAINER_RECT);
        const scrollSpy = vi
            .spyOn(HTMLElement.prototype, 'scrollIntoView')
            .mockImplementation(() => {});
        const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(() => {});

        expect(() => scrollCaseIntoView(root, 'missing')).not.toThrow();
        expect(scrollSpy).not.toHaveBeenCalled();
        expect(focusSpy).not.toHaveBeenCalled();
    });

    it('returns early when root is null', () => {
        const scrollSpy = vi
            .spyOn(HTMLElement.prototype, 'scrollIntoView')
            .mockImplementation(() => {});
        const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(() => {});

        expect(() => scrollCaseIntoView(null, 'case-1')).not.toThrow();
        expect(scrollSpy).not.toHaveBeenCalled();
        expect(focusSpy).not.toHaveBeenCalled();
    });

    it('handles case ids containing CSS-special characters via CSS.escape', () => {
        const { root, child } = mountChild('a"b\'c');
        vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(CONTAINER_RECT);
        vi.spyOn(child, 'getBoundingClientRect').mockReturnValue(OUT_OF_VIEW_RECT);
        const scrollSpy = vi
            .spyOn(HTMLElement.prototype, 'scrollIntoView')
            .mockImplementation(() => {});

        expect(() => scrollCaseIntoView(root, 'a"b\'c')).not.toThrow();
        expect(scrollSpy).toHaveBeenCalled();
    });
});
