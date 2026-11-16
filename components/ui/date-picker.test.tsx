import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

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
    await user.click(day(/November 20th, 2026/));

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

    expect(day(/November 17th, 2026/)).toBeDisabled();
    expect(day(/November 18th, 2026/)).toBeEnabled();
    await user.click(day(/November 17th, 2026/));
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
    expect(day(/November 20th, 2026/)).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(day(/November 21st, 2026/)).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
