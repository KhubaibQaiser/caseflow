import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

let pathname = '/contacts';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

import { PermissionsProvider } from '@/lib/auth/permissions-context';
import type { ShellViewer } from '@/lib/auth/permissions-context';

import { Sidebar } from './sidebar';
import { TabBar } from './tab-bar';

const viewer: ShellViewer = {
  displayName: 'Sam Patel',
  role: 'viewer',
  permissions: ['contacts.read'],
};
const signOut = async () => {};

function inShell(ui: React.ReactNode) {
  return render(
    <PermissionsProvider viewer={viewer}>{ui}</PermissionsProvider>,
  );
}

describe.each([
  ['Sidebar', () => <Sidebar signOut={signOut} />],
  ['TabBar', () => <TabBar signOut={signOut} />],
])('%s', (_name, ui) => {
  it('marks only the current section with aria-current', () => {
    pathname = '/pipeline';
    inShell(ui());
    const nav = screen.getAllByRole('navigation')[0]!;
    const current = nav.querySelectorAll('[aria-current="page"]');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent('Pipeline');
  });

  it('keeps Contacts current on a contact detail page', () => {
    pathname = '/contacts/abc-123/edit';
    inShell(ui());
    expect(screen.getByRole('link', { name: /Contacts/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('marks nothing current on an unknown path', () => {
    pathname = '/no-such-page';
    inShell(ui());
    expect(document.querySelector('[aria-current]')).toBeNull();
  });
});

describe('Sidebar account menu', () => {
  const admin = {
    displayName: 'Alex Morgan',
    role: 'admin' as const,
    permissions: ['contacts.write'] as ShellViewer['permissions'],
  };

  it('shows "Name · Role" on one row, with no separate Sign out', () => {
    pathname = '/contacts';
    render(
      <PermissionsProvider viewer={admin}>
        <Sidebar signOut={signOut} />
      </PermissionsProvider>,
    );
    const trigger = screen.getByRole('button', {
      name: 'Account: Alex Morgan, Admin',
    });
    expect(trigger).toHaveTextContent('Alex Morgan · Admin');
    expect(trigger).toHaveTextContent('AM');
    expect(
      screen.queryByRole('button', { name: 'Sign out' }),
    ).not.toBeInTheDocument();
  });

  it('puts a lock before Viewer; the menu says read-only and offers Sign out', async () => {
    pathname = '/contacts';
    inShell(<Sidebar signOut={signOut} />);
    const trigger = screen.getByRole('button', {
      name: 'Account: Sam Patel, Viewer',
    });
    expect(trigger).toHaveTextContent('Sam Patel · Viewer');
    expect(trigger.querySelector('svg.lucide-lock')).not.toBeNull();
    await userEvent.setup().click(trigger);
    const menu = await screen.findByRole('menu');
    expect(menu).toHaveTextContent('Sam Patel');
    expect(menu).toHaveTextContent('Viewer · read-only');
    expect(
      screen.getByRole('menuitem', { name: 'Sign out' }),
    ).toBeInTheDocument();
  });

  it('submits the sign-out action from the menu', async () => {
    pathname = '/contacts';
    const out = vi.fn(async () => {});
    inShell(<Sidebar signOut={out} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /^Account:/ }));
    await user.click(await screen.findByRole('menuitem', { name: 'Sign out' }));
    await vi.waitFor(() => expect(out).toHaveBeenCalled());
  });
});

describe('TabBar Account tab', () => {
  it('opens the account sheet with the role and Sign out', async () => {
    pathname = '/contacts';
    inShell(<TabBar signOut={signOut} />);
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Account' }));
    const sheet = await screen.findByRole('dialog', { name: 'Account' });
    expect(sheet).toHaveTextContent('Viewer · read-only');
    expect(
      screen.getByRole('button', { name: 'Sign out' }),
    ).toBeInTheDocument();
  });
});

describe('Sidebar rail', () => {
  it('shows an icon link’s label in a tooltip on keyboard focus', async () => {
    pathname = '/contacts';
    inShell(<Sidebar signOut={signOut} />);
    const user = userEvent.setup();
    // First stop is Contacts; Radix opens the tip on focus, once the lazy chunk has loaded.
    await user.tab();
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Contacts');
  });

  it('labels the account avatar with name and role in a tooltip on focus', async () => {
    pathname = '/contacts';
    inShell(<Sidebar signOut={signOut} />);
    const user = userEvent.setup();
    await user.tab();
    await user.tab();
    await user.tab();
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Sam Patel · Viewer',
    );
  });
});

describe('Account sheet Sign out', () => {
  it('has no tooltip: the label is already visible there', async () => {
    pathname = '/contacts';
    inShell(<TabBar signOut={signOut} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Account' }));
    await screen.findByRole('dialog', { name: 'Account' });
    screen.getByRole('button', { name: 'Sign out' }).focus();
    await new Promise((r) => setTimeout(r, 400));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
