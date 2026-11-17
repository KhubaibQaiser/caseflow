'use client';

import { ContactForm } from '@/features/contacts/form/contact-form-lazy';
import type { ContactDetail } from '@/lib/contracts/contact';
import { fail, ok } from '@/lib/contracts/result';

export function FixtureForm({
  today,
  outcome,
}: {
  today: string;
  outcome: string;
}) {
  const initial: ContactDetail = {
    id: 'fixture',
    fullName: 'Marisol Ortega',
    email: 'marisol@example.com',
    phone: '(512) 555-0148',
    matterType: 'personal_injury',
    referralSource: 'attorney_referral',
    status: 'lead',
    followUpOn: today,
    createdAt: '2026-11-01T10:00:00.000000+00:00',
    updatedAt: '2026-11-10T10:00:00.123456+00:00',
    urgency: 'today',
    daysOverdue: null,
    summary:
      'Rear-ended on I-35. Treating at St. David’s; wants a callback before Friday.',
    notes: [],
    activities: [],
  };
  return (
    <ContactForm
      mode="edit"
      initial={initial}
      today={today}
      onSubmit={async () => {
        if (outcome === 'slow') return new Promise(() => {});
        if (outcome === 'conflict')
          return fail(
            'conflict',
            'This contact was changed since you opened it.',
          );
        if (outcome === 'fail') return fail('server', 'Something broke.');
        return ok({ id: 'fixture' });
      }}
    />
  );
}
