import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PermissionsProvider } from '@/lib/auth/permissions-context';

import { MobileTopBar } from './mobile-top-bar';

describe('MobileTopBar', () => {
  it('is the brand mark and the theme button, no links, for an admin too', () => {
    render(
      <PermissionsProvider
        viewer={{
          displayName: 'Alex Morgan',
          role: 'admin',
          permissions: ['contacts.read', 'contacts.write'],
        }}
      >
        <MobileTopBar />
      </PermissionsProvider>,
    );
    expect(screen.getByText('Caseflow')).toBeVisible();
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByRole('button', { name: /^Theme/ })).toBeInTheDocument();
  });
});
