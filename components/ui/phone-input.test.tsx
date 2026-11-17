import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { Field } from './field';
import { PhoneInput } from './phone-input';

function Harness({ initial = '' }: { initial?: string }) {
  const [v, setV] = useState(initial);
  return (
    <Field id="phone" label="Phone">
      <PhoneInput value={v} onChange={setV} />
      <output data-testid="value">{v}</output>
    </Field>
  );
}
const value = () => screen.getByTestId('value').textContent;

describe('PhoneInput', () => {
  it('formats as you type and emits E.164', async () => {
    render(<Harness />);
    const input = screen.getByLabelText('Phone');
    await userEvent.type(input, '5125550148');
    expect(input).toHaveValue('(512) 555-0148');
    expect(value()).toBe('+15125550148');
    expect(input).toHaveAttribute('type', 'tel');
    expect(input).toHaveAttribute('autocomplete', 'tel-national');
  });

  it('switches country when an international number is pasted', async () => {
    render(<Harness />);
    const input = screen.getByLabelText('Phone');
    await userEvent.click(input);
    await userEvent.paste('+44 7400 123456');
    expect(screen.getByRole('button', { name: /country/i })).toHaveTextContent(
      'GB +44',
    );
    expect(input).toHaveValue('07400 123456');
    expect(value()).toBe('+447400123456');
  });

  it('picks a country from the searchable list', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /country/i }));
    await userEvent.type(screen.getByRole('combobox'), 'united king');
    await userEvent.click(
      screen.getByRole('option', { name: /United Kingdom/ }),
    );
    expect(screen.getByRole('button', { name: /country/i })).toHaveTextContent(
      'GB +44',
    );
    await userEvent.type(screen.getByLabelText('Phone'), '7400123456');
    expect(value()).toBe('+447400123456');
  });

  it("shows the selected country's example number as the placeholder", async () => {
    render(<Harness initial="+15125550148" />);
    const input = screen.getByLabelText('Phone');
    expect(await screen.findByPlaceholderText('(201) 555-0123')).toBe(input);
    await userEvent.click(screen.getByRole('button', { name: /country/i }));
    await userEvent.type(screen.getByRole('combobox'), 'united king');
    await userEvent.click(
      screen.getByRole('option', { name: /United Kingdom/ }),
    );
    expect(await screen.findByPlaceholderText('07400 123456')).toBe(input);
  });

  it('shows a stored number nationally', () => {
    render(<Harness initial="+15125550148" />);
    expect(screen.getByLabelText('Phone')).toHaveValue('(512) 555-0148');
  });

  it('warns about a legacy number until it is edited', async () => {
    render(<Harness initial="ext 5" />);
    const input = screen.getByLabelText('Phone');
    expect(input).toHaveValue('ext 5');
    expect(screen.getByText('Check this number')).toBeInTheDocument();
    expect(input.getAttribute('aria-describedby')).toContain('phone-legacy');
    await userEvent.type(input, '1');
    expect(screen.queryByText('Check this number')).not.toBeInTheDocument();
  });
});
