// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRef } from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { createCaseTab } from '@/test/factories';
import type { VisibleCaseItem } from '@/modules/api-debug/hooks/useVisibleProjects';
import CaseChildrenList from './CaseChildrenList';
import type { InputRef } from '../../../../components/ui/primitives';

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

function makeCases(count: number): VisibleCaseItem[] {
    return Array.from({ length: count }, (_, i) => ({
        caseItem: createCaseTab({ id: `case-${i + 1}`, name: `Case ${i + 1}` }),
        caseIndex: i,
    }));
}

function renderList(activeCaseIndex: number, cases: VisibleCaseItem[]) {
    const inputRef = createRef<InputRef | null>();
    return render(
        <CaseChildrenList
            cases={cases}
            projectIndex={0}
            activeProjectIndex={0}
            activeCaseIndex={activeCaseIndex}
            searchHighlightTerm=""
            isEditing={() => false}
            editingName=""
            inputRef={inputRef}
            getCaseMenu={() => []}
            getCaseActionHandler={() => () => {}}
            onEditingNameChange={() => {}}
            onFinishRename={() => {}}
        />,
    );
}

if (typeof HTMLElement.prototype.scrollIntoView !== 'function') {
    HTMLElement.prototype.scrollIntoView = () => {};
}

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('CaseChildrenList active-case scroll-into-view', () => {
    it('renders a data-case-id attribute on every case item', () => {
        const cases = makeCases(3);
        const { container } = renderList(0, cases);

        cases.forEach((c) => {
            expect(container.querySelector(`[data-case-id="${c.caseItem.id}"]`)).toBeTruthy();
        });
    });

    it('scrolls and focuses the active case when it is outside the viewport', async () => {
        const scrollSpy = vi
            .spyOn(HTMLElement.prototype, 'scrollIntoView')
            .mockImplementation(() => {});
        const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(() => {});

        const cases = makeCases(3);
        const { container } = renderList(2, cases);

        const root = container.querySelector('.case-children') as HTMLElement;
        vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(CONTAINER_RECT);
        const activeEl = container.querySelector('[data-case-id="case-3"]') as HTMLElement;
        vi.spyOn(activeEl, 'getBoundingClientRect').mockReturnValue(OUT_OF_VIEW_RECT);

        await waitFor(() => expect(scrollSpy).toHaveBeenCalled());
        expect(focusSpy).toHaveBeenCalled();
    });

    it('does not scroll when the active case is already in view', async () => {
        const scrollSpy = vi
            .spyOn(HTMLElement.prototype, 'scrollIntoView')
            .mockImplementation(() => {});
        const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(() => {});

        const cases = makeCases(3);
        const { container } = renderList(0, cases);

        const root = container.querySelector('.case-children') as HTMLElement;
        vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(CONTAINER_RECT);
        const activeEl = container.querySelector('[data-case-id="case-1"]') as HTMLElement;
        vi.spyOn(activeEl, 'getBoundingClientRect').mockReturnValue(IN_VIEW_RECT);

        await new Promise((resolve) => {
            setTimeout(resolve, 50);
        });
        expect(scrollSpy).not.toHaveBeenCalled();
        expect(focusSpy).not.toHaveBeenCalled();
    });
});
