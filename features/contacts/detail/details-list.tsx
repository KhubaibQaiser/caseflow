import type { ReactNode } from 'react';

import type { ContactDetail } from '@/lib/contracts/contact';
import {
  MATTER_TYPE_LABEL,
  REFERRAL_SOURCE_LABEL,
} from '@/lib/contracts/enums';

import { Panel } from './panel';

const link = 'text-accent underline-offset-3 hover:underline wrap-anywhere';

/** Digits and a leading +, so any typed format dials. */
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-ink-2">{label}</dt>
      <dd className="m-0 min-w-0">{children}</dd>
    </>
  );
}

const missing = <span className="text-ink-2">Not provided</span>;

export function DetailsList({
  contact,
}: {
  contact: Pick<
    ContactDetail,
    'phone' | 'email' | 'matterType' | 'referralSource' | 'summary'
  >;
}) {
  const { phone, email, matterType, referralSource, summary } = contact;
  return (
    <Panel title="Details">
      <dl className="text-13 m-0 grid grid-cols-[104px_1fr] gap-x-4 gap-y-2 sm:grid-cols-[140px_1fr]">
        <Row label="Phone">
          {phone ? (
            <a href={telHref(phone)} className={`${link} tnum`}>
              {phone}
            </a>
          ) : (
            missing
          )}
        </Row>
        <Row label="Email">
          {email ? (
            <a href={`mailto:${email}`} className={link}>
              {email}
            </a>
          ) : (
            missing
          )}
        </Row>
        <Row label="Matter type">{MATTER_TYPE_LABEL[matterType]}</Row>
        <Row label="Referral source">
          {referralSource ? REFERRAL_SOURCE_LABEL[referralSource] : missing}
        </Row>
        <Row label="Matter summary">
          {summary ? (
            <p className="m-0 max-w-[68ch] leading-relaxed wrap-anywhere whitespace-pre-wrap">
              {summary}
            </p>
          ) : (
            missing
          )}
        </Row>
      </dl>
    </Panel>
  );
}
