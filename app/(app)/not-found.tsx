import type { Metadata } from 'next';
import RouteOff from 'lucide-react/icons/route-off';

import { ButtonLink } from '@/components/ui/button-link';
import { EmptyState } from '@/components/ui/empty-state';

import { RequestedPath } from './requested-path';

const TITLE = 'Page not found · Caseflow';
export const metadata: Metadata = { title: TITLE };

// Unknown URLs land here through [...missing], so they render inside the app shell.
export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      {/* ponytail: Next 16.4 swaps the metadata title back to the page's on hydration; this keeps it. Drop if fixed upstream. */}
      <title>{TITLE}</title>
      <EmptyState
        page
        icon={RouteOff}
        title="Page not found."
        description={
          <>
            No page at{' '}
            <span className="text-ink font-medium wrap-anywhere">
              <RequestedPath />
            </span>
          </>
        }
        action={
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <ButtonLink href="/contacts" variant="primary">
              Go to contacts
            </ButtonLink>
            <ButtonLink href="/pipeline" variant="link">
              Pipeline
            </ButtonLink>
          </div>
        }
      />
    </div>
  );
}
