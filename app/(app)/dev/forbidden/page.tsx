import type { Metadata } from 'next';
import { forbidden, notFound } from 'next/navigation';

import { getViewer } from '@/lib/auth/viewer';

export const metadata: Metadata = { title: 'Forbidden · Caseflow' };

// Dev fixture: a write-only page, so the forbidden screen can be seen and tested before real routes exist.
export default async function DevForbidden() {
  if (process.env.VERCEL_ENV === 'production') notFound();
  const { permissions } = await getViewer();
  if (!permissions.includes('contacts.write')) forbidden();
  return <p>Admin can open this page.</p>;
}
