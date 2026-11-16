import { render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { ROLE_PERMISSIONS } from '@/lib/contracts/permissions';

import {
  Can,
  PermissionsProvider,
  usePermission,
  useViewer,
} from './permissions-context';
import type { ShellViewer } from './permissions-context';

const admin: ShellViewer = {
  displayName: 'Alex Morgan',
  role: 'admin',
  permissions: [...ROLE_PERMISSIONS.admin],
};
const viewer: ShellViewer = {
  displayName: 'Sam Patel',
  role: 'viewer',
  permissions: [...ROLE_PERMISSIONS.viewer],
};

function wrap(v: ShellViewer) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <PermissionsProvider viewer={v}>{children}</PermissionsProvider>;
  };
}

describe('usePermission', () => {
  it('is false for a viewer and true for an admin on contacts.write', () => {
    const asViewer = renderHook(() => usePermission('contacts.write'), {
      wrapper: wrap(viewer),
    });
    const asAdmin = renderHook(() => usePermission('contacts.write'), {
      wrapper: wrap(admin),
    });
    expect(asViewer.result.current).toBe(false);
    expect(asAdmin.result.current).toBe(true);
  });

  it('lets a viewer read contacts', () => {
    const { result } = renderHook(() => usePermission('contacts.read'), {
      wrapper: wrap(viewer),
    });
    expect(result.current).toBe(true);
  });

  it('throws outside a provider so a missing provider is never read as "no access"', () => {
    expect(() => renderHook(() => usePermission('contacts.read'))).toThrow(
      /PermissionsProvider/,
    );
  });
});

describe('useViewer', () => {
  it('returns the display name and role', () => {
    const { result } = renderHook(() => useViewer(), { wrapper: wrap(viewer) });
    expect(result.current).toMatchObject({
      displayName: 'Sam Patel',
      role: 'viewer',
    });
  });
});

describe('<Can>', () => {
  it('renders children when allowed', () => {
    render(
      <PermissionsProvider viewer={admin}>
        <Can p="contacts.write" fallback="read-only">
          New contact
        </Can>
      </PermissionsProvider>,
    );
    expect(screen.getByText('New contact')).toBeInTheDocument();
    expect(screen.queryByText('read-only')).not.toBeInTheDocument();
  });

  it('renders the fallback when not allowed', () => {
    render(
      <PermissionsProvider viewer={viewer}>
        <Can p="contacts.write" fallback="read-only">
          New contact
        </Can>
      </PermissionsProvider>,
    );
    expect(screen.getByText('read-only')).toBeInTheDocument();
    expect(screen.queryByText('New contact')).not.toBeInTheDocument();
  });

  it('renders nothing without a fallback', () => {
    const { container } = render(
      <PermissionsProvider viewer={viewer}>
        <Can p="contacts.write">New contact</Can>
      </PermissionsProvider>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
