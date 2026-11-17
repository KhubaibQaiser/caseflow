import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { Breadcrumb } from '@/components/shell/breadcrumb';
import {
  addNoteAction,
  moveContactAction,
  rescheduleAction,
} from '@/features/contacts/actions';
import { Timeline } from '@/features/contacts/detail/timeline';
import { ContactDetailView } from '@/features/contacts/detail/contact-detail';
import { getContact } from '@/lib/data';
import { todayIn } from '@/lib/dates/date-only';
import { getRequestTimeZone } from '@/lib/dates/server';

// One read serves the title and the page.
const loadContact = cache(getContact);

export async function generateMetadata({
  params,
}: PageProps<'/contacts/[id]'>): Promise<Metadata> {
  const contact = await loadContact((await params).id);
  return { title: `${contact?.fullName ?? 'Contact'} · Caseflow` };
}

export default async function ContactPage({
  params,
}: PageProps<'/contacts/[id]'>) {
  const { id } = await params;
  const [contact, tz] = await Promise.all([
    loadContact(id),
    getRequestTimeZone(),
  ]);
  if (!contact) notFound();
  const today = todayIn(tz);
  return (
    <div className="flex flex-col gap-3.5">
      <Breadcrumb
        crumbs={[
          { label: 'Contacts', href: '/contacts' },
          { label: contact.fullName },
        ]}
      />
      <ContactDetailView
        contact={contact}
        today={today}
        tz={tz}
        onMove={moveContactAction.bind(null, id)}
        onReschedule={rescheduleAction.bind(null, id)}
        onAddNote={addNoteAction.bind(null, id)}
        timeline={
          <Timeline activities={contact.activities} today={today} tz={tz} />
        }
      />
    </div>
  );
}
