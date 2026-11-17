import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

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

  it('refocuses on every failed submit, even with the same errors', () => {
    const { rerender } = render(<ErrorSummary errors={errors} attempt={1} />);
    const alert = screen.getByRole('alert');
    alert.blur();

    rerender(<ErrorSummary errors={errors} attempt={1} />);
    expect(alert).not.toHaveFocus();

    rerender(<ErrorSummary errors={errors} attempt={2} />);
    expect(alert).toHaveFocus();
  });

  it('links each error to its field with label and message', () => {
    render(<ErrorSummary errors={errors} />);

    expect(
      screen.getByRole('link', { name: 'Full name: Enter a full name.' }),
    ).toHaveAttribute('href', '#full-name');
    expect(
      screen.getByRole('link', {
        name: 'Email or phone: Add an email or phone.',
      }),
    ).toHaveAttribute('href', '#phone');
  });

  it('moves focus to the input when a link is followed', async () => {
    Element.prototype.scrollIntoView = vi.fn();
    const user = userEvent.setup();
    render(
      <>
        <ErrorSummary errors={errors.slice(0, 1)} />
        <Field id="full-name" label="Full name" error="Enter a full name.">
          <Input />
        </Field>
      </>,
    );

    await user.click(screen.getByRole('link', { name: /^Full name:/ }));
    expect(screen.getByRole('textbox', { name: /Full name/ })).toHaveFocus();
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

  it('marks a required field with a lowercase note', () => {
    render(
      <Field id="full-name" label="Full name" required>
        <Input />
      </Field>,
    );
    expect(screen.getByText('required')).toBeInTheDocument();
  });

  it('shows a conditional note without marking the control required', () => {
    render(
      <Field id="email" label="Email" requiredNote="required if no phone">
        <Input />
      </Field>,
    );
    expect(screen.getByText('required if no phone')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-required');
  });

  it('keeps the invalid border on hover', () => {
    render(
      <Field id="full-name" label="Full name" error="Enter a full name.">
        <Input />
      </Field>,
    );
    // Hover must not out-rank aria-invalid:border-overdue in the cascade.
    expect(screen.getByRole('textbox')).toHaveClass(
      'enabled:not-aria-invalid:hover:border-ink-2',
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

describe('Textarea counterFrom', () => {
  it('shows the counter from the given length, here always', () => {
    render(
      <Field id="summary" label="Matter summary">
        <Textarea maxLength={1000} counterFrom={0} />
      </Field>,
    );
    expect(screen.getByText('0 / 1,000')).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: 'Matter summary' }),
    ).toHaveAccessibleDescription('0 / 1,000');
  });
});

describe('controlled Textarea', () => {
  it('counts the controlled value, including after a reset', async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState('123456789');
      return (
        <Field id="summary" label="Matter summary">
          <Textarea
            maxLength={10}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <button type="button" onClick={() => setValue('')}>
            Reset
          </button>
        </Field>
      );
    }
    render(<Controlled />);
    expect(screen.getByText('9 / 10')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.queryByText(/\/ 10/)).not.toBeInTheDocument();
  });
});
