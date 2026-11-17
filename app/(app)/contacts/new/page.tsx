import type { Metadata } from 'next';

import { ForbiddenState } from '@/components/shell/forbidden-state';
import { createContactAction } from '@/features/contacts/actions';
import { ContactForm } from '@/features/contacts/form/contact-form-lazy';
import { FormPage } from '@/features/contacts/form/form-page';
import { getViewer } from '@/lib/auth/viewer';
import { todayIn } from '@/lib/dates/date-only';
import { getRequestTimeZone } from '@/lib/dates/server';

export const metadata: Metadata = { title: 'New contact · Caseflow' };

export default async function NewContactPage() {
  const { permissions } = await getViewer();
  if (!permissions.includes('contacts.write'))
    return (
      <ForbiddenState
        action="add contacts"
        description="Your role is Viewer, which is read-only. An admin can change your role or add the contact for you."
        backHref="/contacts"
        backLabel="Back to contacts"
      />
    );
  const today = todayIn(await getRequestTimeZone());
  return (
    <FormPage
      title="New contact"
      crumbs={[
        { label: 'Contacts', href: '/contacts' },
        { label: 'New contact' },
      ]}
    >
      <ContactForm mode="create" today={today} onSubmit={createContactAction} />
    </FormPage>
  );
}
