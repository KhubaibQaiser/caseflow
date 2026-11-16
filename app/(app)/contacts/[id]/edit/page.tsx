import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ForbiddenState } from '@/components/shell/forbidden-state';
import { updateContactAction } from '@/features/contacts/actions';
import { ContactForm } from '@/features/contacts/form/contact-form-lazy';
import { FormPage } from '@/features/contacts/form/form-page';
import { getViewer } from '@/lib/auth/viewer';
import { getContact } from '@/lib/data';
import { todayIn } from '@/lib/dates/date-only';
import { getRequestTimeZone } from '@/lib/dates/server';

export const metadata: Metadata = { title: 'Edit contact · Caseflow' };

export default async function EditContactPage({
  params,
}: PageProps<'/contacts/[id]/edit'>) {
  const { id } = await params;
  const { permissions } = await getViewer();
  if (!permissions.includes('contacts.write'))
    return (
      <ForbiddenState
        action="edit contacts"
        backHref={`/contacts/${id}`}
        backLabel="Back to contact"
      />
    );
  const [contact, tz] = await Promise.all([
    getContact(id),
    getRequestTimeZone(),
  ]);
  if (!contact) notFound();
  return (
    <FormPage
      title="Edit contact"
      crumbs={[
        { label: 'Contacts', href: '/contacts' },
        { label: contact.fullName, href: `/contacts/${contact.id}` },
        { label: 'Edit' },
      ]}
    >
      <ContactForm
        mode="edit"
        initial={contact}
        today={todayIn(tz)}
        onSubmit={updateContactAction.bind(null, contact.id)}
      />
    </FormPage>
  );
}
