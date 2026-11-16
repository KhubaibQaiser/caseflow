import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { FormPage } from '@/features/contacts/form/form-page';
import { todayIn } from '@/lib/dates/date-only';
import { getRequestTimeZone } from '@/lib/dates/server';

import { FixtureForm } from './fixture-form';

export const metadata: Metadata = { title: 'Contact form · Caseflow' };

// Dev fixture: the form with a scripted save (?outcome=conflict|slow|fail), so those states can be seen and tested without a database.
export default async function DevContactForm({
  searchParams,
}: PageProps<'/dev/contact-form'>) {
  if (process.env.VERCEL_ENV === 'production') notFound();
  const { outcome } = await searchParams;
  const today = todayIn(await getRequestTimeZone());
  return (
    <FormPage
      title="Edit contact"
      crumbs={[{ label: 'Contacts', href: '/contacts' }, { label: 'Edit' }]}
    >
      <FixtureForm today={today} outcome={String(outcome ?? '')} />
    </FormPage>
  );
}
