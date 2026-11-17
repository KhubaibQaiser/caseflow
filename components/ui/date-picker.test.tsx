import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { Button } from './button';
import { DatePicker } from './date-picker';

// UTC+14: a toISOString() conversion would land on the previous day here.
const realTz = process.env.TZ;
beforeAll(() => {
  process.env.TZ = 'Pacific/Kiritimati';
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-17T12:00:00Z'));
});
afterAll(() => {
  vi.useRealTimers();
  process.env.TZ = realTz;
});

const day = (name: RegExp) => screen.getByRole('button', { name });

describe('DatePicker', () => {
  it('runs these tests east of UTC+12', () => {
    expect(new Date(2026, 10, 20).getTimezoneOffset()).toBe(-840);
  });

  it('reports the picked day as a date-only string', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DatePicker value={null} onChange={onChange} label="Next follow-up" />,
    );

    await user.click(
      screen.getByRole('button', { name: 'Next follow-up: Pick a date' }),
    );
    await user.click(day(/November 20, 2026/));

    expect(onChange).toHaveBeenCalledExactlyOnceWith('2026-11-20');
  });

  it('disables the days before min', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DatePicker
        value={null}
        onChange={onChange}
        min="2026-11-18"
        label="Next follow-up"
      />,
    );

    await user.click(screen.getByRole('button', { name: /Next follow-up/ }));

    expect(day(/November 17, 2026/)).toBeDisabled();
    expect(day(/November 18, 2026/)).toBeEnabled();
    await user.click(day(/November 17, 2026/));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows the value and clears it', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DatePicker
        value="2026-11-20"
        onChange={onChange}
        label="Next follow-up"
      />,
    );

    await user.click(
      screen.getByRole('button', { name: 'Next follow-up: Fri, Nov 20' }),
    );
    await user.click(screen.getByRole('button', { name: 'Clear' }));

    expect(onChange).toHaveBeenCalledExactlyOnceWith(null);
  });

  it('opens on the selected day and returns focus on Esc', async () => {
    const user = userEvent.setup();
    render(
      <DatePicker value="2026-11-20" onChange={vi.fn()} label="Follow-up" />,
    );
    const trigger = screen.getByRole('button', { name: /Follow-up/ });

    await user.tab();
    await user.keyboard('{Enter}');
    expect(day(/November 20, 2026/)).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(day(/November 21, 2026/)).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('opens from a custom trigger and names the calendar by label', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DatePicker
        value="2026-11-20"
        onChange={onChange}
        label="Reschedule follow-up"
        trigger={
          <Button variant="ghost" size="sm">
            Reschedule
          </Button>
        }
      />,
    );
    const trigger = screen.getByRole('button', { name: 'Reschedule' });

    await user.click(trigger);
    expect(
      screen.getByRole('dialog', { name: 'Reschedule follow-up' }),
    ).toBeInTheDocument();
    await user.click(day(/November 24, 2026/));

    expect(onChange).toHaveBeenCalledExactlyOnceWith('2026-11-24');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('does not open from a trigger blocked by a disabled reason', async () => {
    const user = userEvent.setup();
    render(
      <DatePicker
        value="2026-11-20"
        onChange={vi.fn()}
        label="Reschedule follow-up"
        trigger={
          <Button
            variant="ghost"
            size="sm"
            disabledReason="Viewers can't edit contacts. Ask an admin."
          >
            Reschedule
          </Button>
        }
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Reschedule' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
  });

  it('disables the previous-month control at min', async () => {
    const user = userEvent.setup();
    render(
      <DatePicker
        value={null}
        onChange={vi.fn()}
        min="2026-11-18"
        label="Next follow-up"
      />,
    );

    await user.click(screen.getByRole('button', { name: /Next follow-up/ }));

    expect(
      screen.getByRole('button', { name: /previous month/i }),
    ).toHaveAttribute('aria-disabled', 'true');
    expect(
      screen.getByRole('button', { name: /next month/i }),
    ).not.toHaveAttribute('aria-disabled');
  });

  it('does not open from a blocked trigger by keyboard either', async () => {
    const user = userEvent.setup();
    render(
      <DatePicker
        value="2026-11-20"
        onChange={vi.fn()}
        label="Reschedule follow-up"
        trigger={
          <Button
            variant="ghost"
            size="sm"
            disabledReason="Viewers can't edit contacts. Ask an admin."
          >
            Reschedule
          </Button>
        }
      />,
    );

    await user.tab();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
  });

  it('jumps to another month and year from labelled dropdowns', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DatePicker value={null} onChange={onChange} label="Next follow-up" />,
    );
    await user.click(screen.getByRole('button', { name: /Next follow-up/ }));

    await user.selectOptions(
      screen.getByRole('combobox', { name: /Month/ }),
      'March',
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: /Year/ }),
      '2028',
    );
    await user.click(day(/March 9, 2028/));

    expect(onChange).toHaveBeenCalledExactlyOnceWith('2028-03-09');
  });

  it('keeps min: no years or months before it can be picked', async () => {
    const user = userEvent.setup();
    render(
      <DatePicker
        value={null}
        onChange={vi.fn()}
        min="2026-11-18"
        label="Next follow-up"
      />,
    );
    await user.click(screen.getByRole('button', { name: /Next follow-up/ }));

    const years = screen
      .getByRole('combobox', { name: /Year/ })
      .querySelectorAll('option');
    expect(years[0]).toHaveValue('2026');
    expect(
      screen.getByRole('option', { name: 'October', hidden: true }),
    ).toBeDisabled();
  });

  it('always offers the year of the selected value and of min, however far out', async () => {
    const user = userEvent.setup();
    const years = () =>
      [
        ...screen
          .getByRole('combobox', { name: /Year/ })
          .querySelectorAll('option'),
      ].map((o) => o.value);

    const old = render(
      <DatePicker value="2005-03-01" onChange={vi.fn()} label="Created" />,
    );
    await user.click(screen.getByRole('button', { name: /Created/ }));
    expect(years()).toContain('2005');
    old.unmount();

    const far = render(
      <DatePicker value="2040-01-01" onChange={vi.fn()} label="Created" />,
    );
    await user.click(screen.getByRole('button', { name: /Created/ }));
    expect(years()).toContain('2040');
    far.unmount();

    render(
      <DatePicker
        value={null}
        min="2045-06-01"
        onChange={vi.fn()}
        label="Created"
      />,
    );
    await user.click(screen.getByRole('button', { name: /Created/ }));
    expect(years()).toContain('2045');
  });
});
