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

describe('Sidebar account block', () => {
  it('shows the viewer name and read-only badge, and a Sign out button', () => {
    pathname = '/contacts';
    inShell(<Sidebar signOut={signOut} />);
    expect(screen.getByText('Sam Patel')).toBeInTheDocument();
    expect(screen.getByRole('complementary')).toHaveTextContent(
      'Viewer · read-only',
    );
    expect(
      screen.getByRole('button', { name: 'Sign out' }),
    ).toBeInTheDocument();
  });

  it('shows a plain Admin badge for an admin', () => {
    render(
      <PermissionsProvider
        viewer={{
          displayName: 'Alex Morgan',
          role: 'admin',
          permissions: ['contacts.write'],
        }}
      >
        <Sidebar signOut={signOut} />
      </PermissionsProvider>,
    );
    expect(screen.getByRole('complementary')).toHaveTextContent('Admin');
    expect(screen.getByRole('complementary')).not.toHaveTextContent(
      'read-only',
    );
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
