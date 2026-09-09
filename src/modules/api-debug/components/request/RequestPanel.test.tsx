// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ParamsSection } from './RequestPanel';

vi.mock('../editor/ParamEdit', () => ({
    default: () => <div data-testid="param-editor" />,
}));

describe('ParamsSection', () => {
    afterEach(cleanup);

    const renderSection = (overrides: Partial<ComponentProps<typeof ParamsSection>> = {}) => {
        const props: ComponentProps<typeof ParamsSection> = {
            collapsed: false,
            count: 38,
            onToggle: vi.fn(),
            params: [],
            onChange: vi.fn(),
            commonParams: [],
            rawMode: false,
            onToggleRawMode: vi.fn(),
            rawText: 'funcid:150501',
            ...overrides,
        };
        return { ...render(<ParamsSection {...props} />), props };
    };

    it('labels the section count and toggles the complete leading area', async () => {
        const user = userEvent.setup();
        const { props } = renderSection();

        expect(screen.getByText('请求参数')).toBeTruthy();
        expect(screen.getByText('38')).toBeTruthy();
        await user.click(screen.getByRole('button', { name: '折叠请求参数' }));
        expect(props.onToggle).toHaveBeenCalledTimes(1);
    });

    it('exposes and reflects the Raw view toggle state', async () => {
        const user = userEvent.setup();
        const { props } = renderSection({ rawMode: true });
        const rawToggle = screen.getByRole('button', { name: '切换 Raw 参数视图' });

        expect(rawToggle.getAttribute('aria-pressed')).toBe('true');
        expect(document.querySelector('.param-raw-view')).not.toBeNull();
        await user.click(rawToggle);
        expect(props.onToggleRawMode).toHaveBeenCalledTimes(1);
    });
});
