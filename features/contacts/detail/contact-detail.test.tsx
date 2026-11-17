import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { toast } from '@/components/ui/toaster';
import { fail, ok } from '@/lib/contracts/result';

import { ContactDetailView } from './contact-detail';
import { contact, renderAs } from './test-utils';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/contacts/c-00001',
}));
vi.mock('@/components/ui/toaster', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

const TODAY = '2026-11-17';
const props = (
  over: Partial<Parameters<typeof ContactDetailView>[0]> = {},
) => ({
  contact: contact(),
  today: TODAY,
  tz: 'UTC',
  onMove: vi.fn(),
  onReschedule: vi.fn(),
  onAddNote: vi.fn(),
  timeline: null,
  ...over,
});

beforeEach(() => {
  push.mockReset();
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
});

describe('ContactDetailView', () => {
  it('shows the new status and mutes the follow-up at once after a move to Closed', async () => {
    const user = userEvent.setup();
    const c = contact();
    const onMove = vi
      .fn()
      .mockResolvedValue(
        ok({ ...c, status: 'closed', urgency: 'later', daysOverdue: null }),
      );
    renderAs('admin', <ContactDetailView {...props({ onMove })} />);
    expect(screen.getByText('Overdue · 2d')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Move to…' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Closed' }));

    expect(onMove).toHaveBeenCalledExactlyOnceWith('closed');
    expect(
      await screen.findByText("Closed contacts aren't flagged overdue."),
    ).toBeVisible();
    expect(screen.queryByText('Overdue · 2d')).not.toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith(
      'Marisol Ortega moved to Closed.',
    );
  });

  it('toasts a failed move with Retry, and the contact stays put', async () => {
    const user = userEvent.setup();
    const onMove = vi
      .fn()
      .mockResolvedValue(fail('server', 'Something went wrong. Try again.'));
    renderAs('admin', <ContactDetailView {...props({ onMove })} />);

    await user.click(screen.getByRole('button', { name: 'Move to…' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Active' }));

    expect(toast.error).toHaveBeenCalledWith(
      'Something went wrong. Try again.',
      { action: { label: 'Retry', onClick: expect.any(Function) } },
    );
    expect(screen.getByText('Lead')).toBeVisible();
  });

  it('names what was not allowed when the server says forbidden', async () => {
    const user = userEvent.setup();
    const onMove = vi.fn().mockResolvedValue(fail('forbidden', 'no'));
    renderAs('admin', <ContactDetailView {...props({ onMove })} />);

    await user.click(screen.getByRole('button', { name: 'Move to…' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Active' }));

    expect(toast.error).toHaveBeenCalledWith(
      "You don't have permission to move contacts.",
    );
  });

  it('shows the new follow-up straight away and says so', async () => {
    const user = userEvent.setup();
    const c = contact();
    const onReschedule = vi.fn().mockResolvedValue(
      ok({
        ...c,
        followUpOn: '2026-11-20',
        urgency: 'later',
        daysOverdue: null,
      }),
    );
    renderAs('admin', <ContactDetailView {...props({ onReschedule })} />);

    await user.click(screen.getByRole('button', { name: 'Reschedule' }));
    await user.click(
      await screen.findByRole('button', { name: /November 20, 2026/ }),
    );

    expect(await screen.findByText('Due Fri, Nov 20')).toBeVisible();
    expect(toast.success).toHaveBeenCalledWith('Follow-up set to Fri, Nov 20.');
  });

  it('shows how long an open contact has waited, and nothing for a closed one', () => {
    const { unmount } = renderAs('admin', <ContactDetailView {...props()} />);
    expect(screen.getByText(/waiting 5d/)).toBeVisible();
    unmount();
    renderAs(
      'admin',
      <ContactDetailView
        {...props({ contact: contact({ status: 'closed' }) })}
      />,
    );
    expect(screen.getByText(/Enquired Nov 12/)).toBeVisible();
    expect(screen.queryByText(/waiting/)).not.toBeInTheDocument();
  });

  it('lets a viewer read everything and write nothing', () => {
    renderAs('viewer', <ContactDetailView {...props()} />);
    for (const name of ['Move to…', 'Edit', 'Reschedule'])
      expect(screen.getByRole('button', { name })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
    expect(
      screen.queryByRole('link', { name: 'Edit' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('links an admin to the edit page, and offers Call only when there is a phone', () => {
    const { rerender } = renderAs('admin', <ContactDetailView {...props()} />);
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute(
      'href',
      '/contacts/c-00001/edit',
    );
    expect(
      screen.getByRole('link', { name: 'Call Marisol Ortega' }),
    ).toHaveAttribute('href', 'tel:5125550148');

    rerender(
      <ContactDetailView {...props({ contact: contact({ phone: null }) })} />,
    );
    expect(
      screen.queryByRole('link', { name: /Call/ }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText('Not provided').length).toBeGreaterThan(0);
  });
});
