// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ControlCharText } from './ControlCharText';

describe('ControlCharText', () => {
    afterEach(cleanup);

    it('renders SOH as a visible marker', () => {
        const { container } = render(
            <ControlCharText text={`8=FIXT.1.1${String.fromCharCode(1)}9=82`} />,
        );

        const marker = container.querySelector('.ctrl-char-soh');
        expect(marker?.textContent).toBe('□');
        expect(marker?.getAttribute('title')).toBeNull();
    });

    it('renders literal square characters separately from SOH markers', () => {
        const { container } = render(<ControlCharText text="字面□值" />);

        expect(container.querySelector('.ctrl-char-soh')).toBeNull();
        expect(container.textContent).toBe('字面■值');
    });
});
