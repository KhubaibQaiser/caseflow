import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ErrorSummary, Field } from './field';
import { Input } from './input';
import { Textarea } from './textarea';

const errors = [
  { id: 'full-name', label: 'Full name', message: 'Enter a full name.' },
  { id: 'phone', label: 'Email or phone', message: 'Add an email or phone.' },
];

describe('ErrorSummary', () => {
  it('takes focus when errors appear', () => {
    const { rerender } = render(<ErrorSummary errors={[]} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    rerender(<ErrorSummary errors={errors} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveFocus();
    expect(alert).toHaveTextContent('2 fields need attention.');
  });

  it('links each error to its field', () => {
    render(<ErrorSummary errors={errors} />);

    expect(screen.getByRole('link', { name: 'Full name' })).toHaveAttribute(
      'href',
      '#full-name',
    );
    expect(
      screen.getByRole('link', { name: 'Email or phone' }),
    ).toHaveAttribute('href', '#phone');
  });

  it('uses the singular for one error', () => {
    render(<ErrorSummary errors={errors.slice(0, 1)} />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      '1 field needs attention.',
    );
  });
});

describe('Field', () => {
  it('ties the label, hint and error to the control', () => {
    render(
      <Field
        id="full-name"
        label="Full name"
        required
        hint="As it appears on ID."
        error="Enter a full name."
      >
        <Input />
      </Field>,
    );

    const input = screen.getByRole('textbox', { name: /Full name/ });
    expect(input).toHaveAttribute('id', 'full-name');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).toHaveAccessibleDescription(
      'Enter a full name. As it appears on ID.',
    );
  });

  it('leaves a valid control unmarked', () => {
    render(
      <Field id="phone" label="Phone">
        <Input />
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: 'Phone' });
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).not.toHaveAttribute('aria-describedby');
  });
});

describe('Textarea', () => {
  it('shows the counter only past 80% of the maximum', async () => {
    const user = userEvent.setup();
    render(
      <Field id="summary" label="Matter summary">
        <Textarea maxLength={10} />
      </Field>,
    );
    const box = screen.getByRole('textbox', { name: 'Matter summary' });

    await user.type(box, '12345678');
    expect(screen.queryByText('8 / 10')).not.toBeInTheDocument();

    await user.type(box, '9');
    expect(screen.getByText('9 / 10')).toBeInTheDocument();
    expect(box).toHaveAccessibleDescription('9 / 10');
  });
});
