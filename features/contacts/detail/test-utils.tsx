import { render } from '@testing-library/react';
import type { ReactElement } from 'react';

import { PermissionsProvider } from '@/lib/auth/permissions-context';
import type { ContactDetail, Note } from '@/lib/contracts/contact';
import { ROLE_PERMISSIONS, type Role } from '@/lib/contracts/permissions';

export function renderAs(role: Role, ui: ReactElement) {
  return render(
    <PermissionsProvider
      viewer={{
        displayName: role === 'admin' ? 'Alex Morgan' : 'Sam Patel',
        role,
        permissions: [...ROLE_PERMISSIONS[role]],
      }}
    >
      {ui}
    </PermissionsProvider>,
  );
}

export const note = (over: Partial<Note> = {}): Note => ({
  id: 'n-1',
  body: 'Left voicemail.',
  createdAt: '2026-11-13T16:12:00.000Z',
  author: { name: 'Alex Morgan', role: 'admin' },
  ...over,
});

export const contact = (over: Partial<ContactDetail> = {}): ContactDetail => ({
  id: 'c-00001',
  fullName: 'Marisol Ortega',
  email: 'm.ortega@gmail.com',
  phone: '(512) 555-0148',
  matterType: 'personal_injury',
  referralSource: 'google_search',
  status: 'lead',
  followUpOn: '2026-11-15',
  createdAt: '2026-11-12T15:58:00.000Z',
  updatedAt: '2026-11-13T16:12:00.000Z',
  urgency: 'overdue',
  daysOverdue: 2,
  summary: 'Rear-ended on I-35 northbound.',
  notes: [],
  activities: [],
  ...over,
});
