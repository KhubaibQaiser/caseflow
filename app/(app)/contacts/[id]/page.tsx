import { notFound } from 'next/navigation';

import { Breadcrumb } from '@/components/shell/breadcrumb';
import {
  addNoteAction,
  moveContactAction,
  rescheduleAction,
} from '@/features/contacts/actions';
import { ContactDetailView } from '@/features/contacts/detail/contact-detail';
import { getContact } from '@/lib/data';
import { todayIn } from '@/lib/dates/date-only';
import { getRequestTimeZone } from '@/lib/dates/server';

export default async function ContactPage({
  params,
}: PageProps<'/contacts/[id]'>) {
  const { id } = await params;
  const [contact, tz] = await Promise.all([
    getContact(id),
    getRequestTimeZone(),
  ]);
  if (!contact) notFound();
  return (
    <div className="flex flex-col gap-3.5">
      <title>{`${contact.fullName} · Caseflow`}</title>
      <Breadcrumb
        crumbs={[
          { label: 'Contacts', href: '/contacts' },
          { label: contact.fullName },
        ]}
      />
      <ContactDetailView
        contact={contact}
        today={todayIn(tz)}
        tz={tz}
        onMove={moveContactAction.bind(null, id)}
        onReschedule={rescheduleAction.bind(null, id)}
        onAddNote={addNoteAction.bind(null, id)}
      />
    </div>
  );
}
