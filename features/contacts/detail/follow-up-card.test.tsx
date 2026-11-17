import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ok } from '@/lib/contracts/result';

import { FollowUpCard } from './follow-up-card';
import { contact, renderAs } from './test-utils';

const TODAY = '2026-11-17';
const props = (over: Partial<Parameters<typeof FollowUpCard>[0]> = {}) => ({
  contact: contact({
    followUpOn: '2026-11-15',
    urgency: 'overdue',
    daysOverdue: 2,
  }),
  today: TODAY,
  onReschedule: vi.fn().mockResolvedValue(ok(contact())),
  ...over,
});

describe('FollowUpCard', () => {
  it('shows an overdue pill beside the due date', () => {
    renderAs('admin', <FollowUpCard {...props()} />);
    expect(screen.getByText('Overdue · 2d')).toBeVisible();
    expect(screen.getByText('Due Sun, Nov 15')).toBeVisible();
  });

  it('says so when no follow-up is set', () => {
    renderAs(
      'admin',
      <FollowUpCard
        {...props({
          contact: contact({
            followUpOn: null,
            urgency: 'none',
            daysOverdue: null,
          }),
        })}
      />,
    );
    expect(screen.getByText('No follow-up set')).toBeVisible();
  });

  it('mutes a closed contact and says why', () => {
    renderAs(
      'admin',
      <FollowUpCard
        {...props({
          contact: contact({
            status: 'closed',
            urgency: 'later',
            daysOverdue: null,
          }),
        })}
      />,
    );
    expect(screen.queryByText(/Overdue/)).not.toBeInTheDocument();
    expect(
      screen.getByText("Closed contacts aren't flagged overdue."),
    ).toBeVisible();
  });

  it('saves the picked day straight away', async () => {
    const user = userEvent.setup();
    const p = props();
    renderAs('admin', <FollowUpCard {...p} />);

    await user.click(screen.getByRole('button', { name: 'Reschedule' }));
    const dialog = await screen.findByRole('dialog', {
      name: 'Follow-up date',
    });
    await user.click(
      within(dialog).getByRole('button', { name: /November 20, 2026/ }),
    );

    expect(p.onReschedule).toHaveBeenCalledExactlyOnceWith('2026-11-20');
  });

  it("doesn't offer days before today", async () => {
    const user = userEvent.setup();
    renderAs('admin', <FollowUpCard {...props()} />);
    await user.click(screen.getByRole('button', { name: 'Reschedule' }));
    const dialog = await screen.findByRole('dialog', {
      name: 'Follow-up date',
    });
    expect(
      within(dialog).getByRole('button', { name: /November 16, 2026/ }),
    ).toBeDisabled();
  });

  it('blocks Reschedule for a viewer with the reason', async () => {
    const user = userEvent.setup();
    const p = props();
    renderAs('viewer', <FollowUpCard {...p} />);
    const b = screen.getByRole('button', { name: 'Reschedule' });
    expect(b).toHaveAttribute('aria-disabled', 'true');
    await user.click(b);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      "Viewers can't edit contacts. Ask an admin.",
    );
  });
});
