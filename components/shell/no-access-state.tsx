import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';

/**
 * Signed in, but no profile row (NoProfileError). Never sends the user to /login:
 * the proxy would bounce them straight back. The (app) layout renders this.
 */
export function NoAccessState({
  signOut,
}: {
  signOut: () => Promise<void> | void;
}): ReactNode {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <title>No access · Caseflow</title>
      <ErrorState
        page
        title="No access."
        description="Your account isn't set up yet. Ask an admin."
        action={
          <form action={signOut}>
            <Button type="submit" variant="ghost">
              Sign out
            </Button>
          </form>
        }
      />
    </div>
  );
}
