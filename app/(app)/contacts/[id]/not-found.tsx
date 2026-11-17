import UserRoundX from 'lucide-react/icons/user-round-x';

import { ButtonLink } from '@/components/ui/button-link';
import { EmptyState } from '@/components/ui/empty-state';

const TITLE = 'Contact not found · Caseflow';

export default function ContactNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <title>{TITLE}</title>
      <EmptyState
        page
        icon={UserRoundX}
        title="This contact doesn't exist."
        description="It may have been mistyped, or the link is out of date."
        action={
          <ButtonLink href="/contacts" variant="primary">
            Back to contacts
          </ButtonLink>
        }
      />
    </div>
  );
}
