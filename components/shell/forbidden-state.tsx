import Lock from 'lucide-react/icons/lock';

import { ButtonLink } from '@/components/ui/button-link';
import { EmptyState } from '@/components/ui/empty-state';

/** The whole page, for a Viewer who reached a write screen. Rendered by the server, not hidden by the UI. */
export function ForbiddenState({
  action,
  description = 'Your role is Viewer, which is read-only. An admin can change your role or make this edit for you.',
  backHref,
  backLabel,
}: {
  action: string;
  description?: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <title>Not allowed · Caseflow</title>
      <EmptyState
        page
        icon={Lock}
        title={`You can't ${action}.`}
        description={description}
        action={
          <ButtonLink href={backHref} variant="ghost">
            {backLabel}
          </ButtonLink>
        }
      />
    </div>
  );
}
