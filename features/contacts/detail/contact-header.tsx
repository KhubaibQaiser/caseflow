'use client';

import Pencil from 'lucide-react/icons/pencil';
import Phone from 'lucide-react/icons/phone';

import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button-link';
import { PageHeading } from '@/components/ui/page-heading';
import { StatusPill } from '@/components/ui/pill';
import { usePermission } from '@/lib/auth/permissions-context';
import type { ContactRow } from '@/lib/contracts/contact';
import { MATTER_TYPE_LABEL, type Status } from '@/lib/contracts/enums';
import type { Result } from '@/lib/contracts/result';
import { formatEnquired, waitingLabel } from '@/lib/dates/labels';

import { VIEWER_EDIT_REASON } from '../reasons';
import { telHref } from '@/utils/tel-href';
import { MoveMenu } from './move-menu';

type ContactHeaderProps = {
  contact: Pick<
    ContactRow,
    'id' | 'fullName' | 'status' | 'matterType' | 'phone' | 'createdAt'
  >;
  today: string;
  tz: string;
  onMove(to: Status): Promise<Result<ContactRow>>;
};

// Below md the actions are thumb-sized (44px) and Call leads.
const tall = 'max-md:h-11 max-md:px-4';

export function ContactHeader({
  contact,
  today,
  tz,
  onMove,
}: ContactHeaderProps) {
  const canWrite = usePermission('contacts.write');
  const { id, fullName, status, matterType, phone, createdAt } = contact;
  const waiting = waitingLabel(createdAt, today, tz);
  return (
    <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-4">
      <div className="min-w-0">
        <PageHeading
          // Two lines, then an ellipsis, so a very long name never pushes the action row around.
          title={fullName}
          className="text-ink m-0 mb-1.5 line-clamp-2 text-xl font-semibold tracking-tight wrap-anywhere md:text-2xl"
        >
          {fullName}
        </PageHeading>
        <div className="text-13 text-ink-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <StatusPill status={status} />
          <span>{MATTER_TYPE_LABEL[matterType]}</span>
          <span aria-hidden>·</span>
          <span className="tnum">
            Enquired {formatEnquired(createdAt, today, tz)}
            {status !== 'closed' &&
              ` · waiting ${waiting === 'Today' ? 'today' : waiting}`}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {phone && (
          <ButtonLink
            href={telHref(phone)}
            variant="primary"
            aria-label={`Call ${fullName}`}
            className={`${tall} flex-1 gap-1.5 md:hidden`}
          >
            <Phone aria-hidden className="size-4" />
            Call
          </ButtonLink>
        )}
        <MoveMenu
          current={status}
          onMove={onMove}
          disabledReason={canWrite ? undefined : VIEWER_EDIT_REASON}
          className={tall}
        />
        {canWrite ? (
          <ButtonLink
            href={`/contacts/${id}/edit`}
            variant="ghost"
            className={`${tall} gap-1.5`}
          >
            <Pencil aria-hidden className="size-4" />
            Edit
          </ButtonLink>
        ) : (
          <Button
            variant="ghost"
            disabledReason={VIEWER_EDIT_REASON}
            className={`${tall} gap-1.5`}
          >
            <Pencil aria-hidden className="size-4" />
            Edit
          </Button>
        )}
      </div>
    </header>
  );
}
