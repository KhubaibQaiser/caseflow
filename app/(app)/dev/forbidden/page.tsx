import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { requirePermission } from '@/lib/auth/viewer';

export const metadata: Metadata = { title: 'Forbidden · Caseflow' };

// Dev fixture: a write-only page, so the forbidden screen can be seen and tested before real routes exist.
export default async function DevForbidden() {
  if (process.env.VERCEL_ENV === 'production') notFound();
  await requirePermission('contacts.write', '/dev/forbidden');
  return <p>Admin can open this page.</p>;
}
