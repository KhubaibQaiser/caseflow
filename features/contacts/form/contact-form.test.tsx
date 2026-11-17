import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Link from 'next/link';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ContactDetail } from '@/lib/contracts/contact';
import { fail, ok, type Result } from '@/lib/contracts/result';

const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
  usePathname: () => '/contacts/c1/edit',
}));
const success = vi.fn();
vi.mock('@/components/ui/toaster', () => ({
  toast: { success: (m: string) => success(m) },
}));

import { ContactForm } from './contact-form';

const TODAY = '2026-11-17';
const initial: ContactDetail = {
  id: 'c1',
  fullName: 'Marisol Ortega',
  email: 'marisol@example.com',
  phone: null,
  matterType: 'family',
  referralSource: null,
  status: 'lead',
  followUpOn: '2026-11-20',
  createdAt: '2026-11-01T10:00:00.000000+00:00',
  updatedAt: '2026-11-10T10:00:00.123456+00:00',
  urgency: 'later',
  daysOverdue: null,
  summary: 'Custody review.',
  notes: [],
  activities: [],
};

type Submit = (
  input: unknown,
  expectedUpdatedAt?: string,
) => Promise<Result<{ id: string }>>;

function renderForm(onSubmit: Submit, mode: 'create' | 'edit' = 'create') {
  const props =
    mode === 'edit' ? { mode, initial, today: TODAY } : { mode, today: TODAY };
  return render(<ContactForm {...props} onSubmit={onSubmit} />);
}

beforeEach(() => {
  window.history.replaceState(null, '');
  push.mockClear();
  refresh.mockClear();
  success.mockClear();
});

describe('ContactForm', () => {
  it('shows every error at once, focuses the summary and links to the fields', async () => {
    const onSubmit = vi.fn<Submit>();
    renderForm(onSubmit);
    await userEvent.click(screen.getByRole('button', { name: 'Save contact' }));

    const summary = await screen.findByRole('alert');
    expect(summary).toHaveTextContent('3 fields need attention.');
    expect(summary).toHaveFocus();
    expect(screen.getByRole('link', { name: /Full name:/ })).toHaveAttribute(
      'href',
      '#fullName',
    );
    expect(
      screen.getByRole('link', { name: /Email or phone: Add an email/ }),
    ).toHaveAttribute('href', '#contactMethod');
    expect(screen.getByRole('link', { name: /Matter type:/ })).toHaveAttribute(
      'href',
      '#matterType',
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('has no matter type until one is chosen, and says so', async () => {
    renderForm(vi.fn<Submit>());
    const select = screen.getByRole('combobox', { name: /Matter type/ });
    expect(select).toHaveValue('');
    await userEvent.click(screen.getByRole('button', { name: 'Save contact' }));

    expect(select).toBeInvalid();
    expect(select).toHaveAccessibleDescription('Choose a matter type.');
  });

  it('shows the email-or-phone rule once, under the pair, with both inputs invalid', async () => {
    renderForm(vi.fn<Submit>());
    await userEvent.click(screen.getByRole('button', { name: 'Save contact' }));

    expect(
      screen.getAllByText(
        "Add an email or a phone number. Intake can't follow up without one.",
      ),
    ).toHaveLength(1); // one inline line; the summary link carries its label too
    expect(screen.getByRole('textbox', { name: 'Email' })).toBeInvalid();
    expect(screen.getByRole('textbox', { name: 'Phone' })).toBeInvalid();
    expect(
      screen.getByRole('textbox', { name: 'Email' }),
    ).toHaveAccessibleDescription(
      "Add an email or a phone number. Intake can't follow up without one.",
    );
  });

  it('puts a server field error under its field', async () => {
    const onSubmit = vi.fn<Submit>().mockResolvedValue(
      fail('validation', 'Fix the highlighted fields.', {
        fieldErrors: { email: 'Enter a valid email address.' },
      }),
    );
    renderForm(onSubmit, 'edit');
    await userEvent.click(screen.getByRole('button', { name: 'Save contact' }));

    expect(
      await screen.findByRole('textbox', { name: 'Email' }),
    ).toHaveAccessibleDescription('Enter a valid email address.');
    expect(screen.getByRole('alert')).toHaveTextContent(
      '1 field needs attention.',
    );
  });

  it('sends one request when the form is submitted twice in the same tick', async () => {
    let finish: (r: Result<{ id: string }>) => void = () => {};
    const onSubmit = vi.fn<Submit>(
      () => new Promise((resolve) => (finish = resolve)),
    );
    renderForm(onSubmit, 'edit');
    const form = screen.getByRole('form', { name: 'Edit contact' });
    fireEvent.submit(form);
    fireEvent.submit(form);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Saving…' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    await act(async () => finish(ok({ id: 'c1' })));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('sends one request when Save is double-clicked', async () => {
    const onSubmit = vi.fn<Submit>(() => new Promise(() => {}));
    renderForm(onSubmit, 'edit');
    await userEvent.dblClick(
      screen.getByRole('button', { name: 'Save contact' }),
    );
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });

  it('passes the stamp back verbatim and goes to the contact with a toast', async () => {
    const onSubmit = vi.fn<Submit>().mockResolvedValue(ok({ id: 'c1' }));
    renderForm(onSubmit, 'edit');
    await userEvent.click(screen.getByRole('button', { name: 'Save contact' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/contacts/c1'));
    expect(onSubmit.mock.calls[0]?.[1]).toBe(
      '2026-11-10T10:00:00.123456+00:00',
    );
    expect(success).toHaveBeenCalledWith('Contact saved');
  });

  it('keeps every value after a failed save and offers Retry', async () => {
    const onSubmit = vi
      .fn<Submit>()
      .mockResolvedValueOnce(fail('server', 'Something broke.'))
      .mockResolvedValueOnce(ok({ id: 'c1' }));
    renderForm(onSubmit);
    await userEvent.type(
      screen.getByRole('textbox', { name: /Full name/ }),
      'Ana Díaz',
    );
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Phone' }),
      '512 555 0100',
    );
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: /Matter type/ }),
      'family',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save contact' }));

    expect(
      await screen.findByText('Save failed. Your changes are still here.'),
    ).toBeVisible();
    expect(screen.getByRole('textbox', { name: /Full name/ })).toHaveValue(
      'Ana Díaz',
    );
    expect(screen.getByRole('textbox', { name: 'Phone' })).toHaveValue(
      '512 555 0100',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/contacts/c1'));
  });

  it('keeps the input when the request throws', async () => {
    const onSubmit = vi.fn<Submit>().mockRejectedValue(new Error('offline'));
    renderForm(onSubmit, 'edit');
    await userEvent.clear(screen.getByRole('textbox', { name: /Full name/ }));
    await userEvent.type(
      screen.getByRole('textbox', { name: /Full name/ }),
      'Mari',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save contact' }));

    expect(await screen.findByText(/Save failed\./)).toBeVisible();
    expect(screen.getByRole('textbox', { name: /Full name/ })).toHaveValue(
      'Mari',
    );
  });

  it('shows the conflict banner; Reload latest restores the server values', async () => {
    const onSubmit = vi
      .fn<Submit>()
      .mockResolvedValue(
        fail('conflict', 'This contact was changed since you opened it.'),
      );
    const view = renderForm(onSubmit, 'edit');
    const name = screen.getByRole('textbox', { name: /Full name/ });
    await userEvent.clear(name);
    await userEvent.type(name, 'My edit');
    await userEvent.click(screen.getByRole('button', { name: 'Save contact' }));

    expect(
      await screen.findByText('This contact was changed since you opened it.'),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Reload latest' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Overwrite' })).toBeNull();
    expect(refresh).toHaveBeenCalled();

    // The refresh lands: the page re-renders with the newer contact.
    view.rerender(
      <ContactForm
        mode="edit"
        today={TODAY}
        onSubmit={onSubmit}
        initial={{
          ...initial,
          fullName: 'Marisol Ortega-Ruiz',
          updatedAt: '2026-11-17T09:00:00.000001+00:00',
        }}
      />,
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Reload latest' }),
    );

    expect(screen.getByRole('textbox', { name: /Full name/ })).toHaveValue(
      'Marisol Ortega-Ruiz',
    );
    expect(screen.queryByText(/changed since you opened/)).toBeNull();
  });

  it('redirects to sign-in with the page as next when the session has ended', async () => {
    const onSubmit = vi
      .fn<Submit>()
      .mockResolvedValue(fail('unauthorized', 'Sign in again to continue.'));
    renderForm(onSubmit, 'edit');
    await userEvent.click(screen.getByRole('button', { name: 'Save contact' }));

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(
        '/login?reason=expired&next=%2Fcontacts%2Fc1%2Fedit',
      ),
    );
    expect(success).not.toHaveBeenCalled();
  });

  it('blocks page unload only while the form is dirty', async () => {
    renderForm(vi.fn<Submit>());
    const fire = () => {
      const e = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(e);
      return e.defaultPrevented;
    };
    expect(fire()).toBe(false);
    await userEvent.type(
      screen.getByRole('textbox', { name: /Full name/ }),
      'A',
    );
    expect(fire()).toBe(true);
  });

  it('Cancel leaves straight away when clean, and asks first when dirty', async () => {
    renderForm(vi.fn<Submit>(), 'edit');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(push).toHaveBeenCalledWith('/contacts/c1');

    push.mockClear();
    await userEvent.type(
      screen.getByRole('textbox', { name: /Full name/ }),
      'x',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(
      await screen.findByRole('dialog', { name: 'Discard changes?' }),
    ).toBeVisible();
    expect(push).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(push).toHaveBeenCalledWith('/contacts/c1');
  });

  it('asks before an in-app link leaves a dirty form; Cancel keeps the input', async () => {
    render(
      <>
        <Link href="/contacts">Contacts</Link>
        <ContactForm
          mode="edit"
          initial={initial}
          today={TODAY}
          onSubmit={vi.fn<Submit>()}
        />
      </>,
    );
    const name = screen.getByRole('textbox', { name: /Full name/ });
    await userEvent.type(name, ' Jr');
    await userEvent.click(screen.getByRole('link', { name: 'Contacts' }));

    expect(
      await screen.findByRole('dialog', { name: 'Discard changes?' }),
    ).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(name).toHaveValue('Marisol Ortega Jr');
    expect(push).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('link', { name: 'Contacts' }));
    await userEvent.click(
      await screen.findByRole('button', { name: 'Discard' }),
    );
    expect(push).toHaveBeenCalledWith('/contacts');
  });

  it('keeps sending the stamp it opened with after a conflict refresh', async () => {
    const onSubmit = vi
      .fn<Submit>()
      .mockResolvedValueOnce(fail('conflict', 'changed'))
      .mockResolvedValue(fail('server', 'x'));
    const view = renderForm(onSubmit, 'edit');
    await userEvent.type(
      screen.getByRole('textbox', { name: /Full name/ }),
      ' Jr',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save contact' }));
    await screen.findByRole('button', { name: 'Reload latest' });
    view.rerender(
      <ContactForm
        mode="edit"
        today={TODAY}
        onSubmit={onSubmit}
        initial={{ ...initial, updatedAt: '2026-11-17T09:00:00.000001+00:00' }}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save contact' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
    expect(onSubmit.mock.calls[1]?.[1]).toBe(
      '2026-11-10T10:00:00.123456+00:00',
    );
  });

  it('sends the refreshed stamp after Reload latest', async () => {
    const onSubmit = vi
      .fn<Submit>()
      .mockResolvedValueOnce(fail('conflict', 'changed'))
      .mockResolvedValue(ok({ id: 'c1' }));
    const view = renderForm(onSubmit, 'edit');
    await userEvent.type(
      screen.getByRole('textbox', { name: /Full name/ }),
      ' Jr',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save contact' }));
    await screen.findByRole('button', { name: 'Reload latest' });
    view.rerender(
      <ContactForm
        mode="edit"
        today={TODAY}
        onSubmit={onSubmit}
        initial={{ ...initial, updatedAt: '2026-11-17T09:00:00.000001+00:00' }}
      />,
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Reload latest' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save contact' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
    expect(onSubmit.mock.calls[1]?.[1]).toBe(
      '2026-11-17T09:00:00.000001+00:00',
    );
  });

  it('stores the typed values in history state when the session ends', async () => {
    window.history.replaceState({ keep: 1 }, '');
    const onSubmit = vi
      .fn<Submit>()
      .mockResolvedValue(fail('unauthorized', 'Sign in again to continue.'));
    renderForm(onSubmit, 'edit');
    const name = screen.getByRole('textbox', { name: /Full name/ });
    await userEvent.clear(name);
    await userEvent.type(name, 'Typed before expiry');
    await userEvent.click(screen.getByRole('button', { name: 'Save contact' }));

    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(window.history.state.keep).toBe(1);
    expect(window.history.state.caseflowDraft.values.fullName).toBe(
      'Typed before expiry',
    );
    expect(window.history.state.caseflowDraft.stamp).toBe(
      '2026-11-10T10:00:00.123456+00:00',
    );
    expect(
      JSON.stringify(sessionStorage) + JSON.stringify(localStorage),
    ).not.toContain('Typed before expiry');
  });

  it('restores a draft from history state, marks it dirty and clears it', async () => {
    window.history.replaceState(
      {
        keep: 1,
        caseflowDraft: {
          values: {
            fullName: 'Restored Name',
            email: 'marisol@example.com',
            phone: '',
            matterType: 'family',
            referralSource: '',
            status: 'active',
            followUpOn: null,
            summary: 'Back from login.',
          },
          stamp: '2026-11-01T00:00:00.000000+00:00',
        },
      },
      '',
    );
    const onSubmit = vi.fn<Submit>().mockResolvedValue(ok({ id: 'c1' }));
    renderForm(onSubmit, 'edit');

    expect(await screen.findByDisplayValue('Restored Name')).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Matter summary' })).toHaveValue(
      'Back from login.',
    );
    expect(window.history.state.caseflowDraft).toBeUndefined();
    expect(window.history.state.keep).toBe(1);
    const e = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(true); // dirty

    await userEvent.click(screen.getByRole('button', { name: 'Save contact' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]?.[1]).toBe(
      '2026-11-01T00:00:00.000000+00:00',
    );
  });

  it('ignores a malformed draft in history state', () => {
    window.history.replaceState({ caseflowDraft: { values: 'nope' } }, '');
    renderForm(vi.fn<Submit>(), 'edit');
    expect(screen.getByRole('textbox', { name: /Full name/ })).toHaveValue(
      'Marisol Ortega',
    );
  });

  it('shows the server message too when an error names no field', async () => {
    const onSubmit = vi.fn<Submit>().mockResolvedValue(
      fail('validation', 'Fix the highlighted fields.', {
        fieldErrors: { email: 'Enter a valid email address.', form: 'Odd.' },
      }),
    );
    renderForm(onSubmit, 'edit');
    await userEvent.click(screen.getByRole('button', { name: 'Save contact' }));

    expect(
      await screen.findByRole('textbox', { name: 'Email' }),
    ).toHaveAccessibleDescription('Enter a valid email address.');
    expect(screen.getByText('Fix the highlighted fields.')).toBeVisible();
  });

  it('says "Enter a full name." for an empty name', async () => {
    renderForm(vi.fn<Submit>());
    await userEvent.click(screen.getByRole('button', { name: 'Save contact' }));
    expect(
      screen.getByRole('textbox', { name: /Full name/ }),
    ).toHaveAccessibleDescription('Enter a full name.');
  });
});
