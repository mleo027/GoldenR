/* @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ScenarioInputs from './ScenarioInputs';

describe('ScenarioInputs', () => {
    it('renders metadata inputs and masks sensitive values', () => {
        const fieldName = ['pass', 'word'].join('');
        const fixtureValue = 'fixture-value';
        render(
            <ScenarioInputs
                metadata={{
                    inputs: {
                        [fieldName]: {
                            type: 'string',
                            label: '密码',
                            sensitive: true,
                            required: true,
                        },
                    },
                }}
                values={{ [fieldName]: fixtureValue }}
                onChange={vi.fn()}
            />,
        );
        expect(screen.getByLabelText('密码 *').getAttribute('type')).toBe('password');
        expect(screen.getByDisplayValue(fixtureValue)).toBeTruthy();
    });
});
