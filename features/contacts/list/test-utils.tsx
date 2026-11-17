import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import type { OnUrlUpdateFunction } from 'nuqs/adapters/testing';
import type { ReactNode } from 'react';

import { PermissionsProvider } from '@/lib/auth/permissions-context';
import type { ShellViewer } from '@/lib/auth/permissions-context';
import type { ContactRow } from '@/lib/contracts/contact';
import type { ContactFacets } from '@/lib/contracts/facets';
import { ROLE_PERMISSIONS } from '@/lib/contracts/permissions';

import { toListRows } from './list-rows';
import type { ListRow } from './list-rows';

export const TODAY = '2026-11-17';
export const TZ = 'UTC';

const ADMIN: ShellViewer = {
  displayName: 'Alex Morgan',
  role: 'admin',
  permissions: [...ROLE_PERMISSIONS.admin],
};
export const VIEWER: ShellViewer = {
  displayName: 'Sam Patel',
  role: 'viewer',
  permissions: [...ROLE_PERMISSIONS.viewer],
};

export function row(i: number, over: Partial<ContactRow> = {}): ListRow {
  const r: ContactRow = {
    id: `c-${i}`,
    fullName: `Person ${i}`,
    email: `person${i}@example.com`,
    phone: '(512) 555-0148',
    matterType: 'family',
    referralSource: 'past_client',
    status: 'lead',
    followUpOn: null,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-02T10:00:00.000Z',
    urgency: 'none',
    daysOverdue: null,
    ...over,
  };
  return toListRows([r], TODAY, TZ)[0]!;
}

export const rows = (n: number) => Array.from({ length: n }, (_, i) => row(i));

export const FACETS: ContactFacets = {
  total: 1200,
  matching: 1200,
  quickViews: { all: 1200, overdue: 38, dueToday: 12 },
  facets: {
    status: { lead: 480, active: 420, closed: 300 },
    matterType: {
      personal_injury: 200,
      family: 200,
      immigration: 200,
      employment: 200,
      estate_planning: 200,
      criminal_defense: 200,
    },
    referralSource: {
      google_search: 216,
      past_client: 216,
      attorney_referral: 216,
      bar_referral: 216,
      website_form: 216,
    },
    followUp: { overdue: 38, dueToday: 12, next7Days: 160, none: 400 },
  },
};

export function wrapper({
  searchParams = '',
  viewer = ADMIN,
  onUrlUpdate,
  rateLimitFactor,
}: {
  searchParams?: string;
  viewer?: ShellViewer;
  onUrlUpdate?: OnUrlUpdateFunction;
  rateLimitFactor?: number;
} = {}) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NuqsTestingAdapter
        searchParams={searchParams}
        onUrlUpdate={onUrlUpdate}
        rateLimitFactor={rateLimitFactor}
        hasMemory
      >
        <PermissionsProvider viewer={viewer}>{children}</PermissionsProvider>
      </NuqsTestingAdapter>
    );
  };
}
