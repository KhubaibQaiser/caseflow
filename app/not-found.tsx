import type { Metadata } from 'next';

import ShellNotFound from './(app)/not-found';

export const metadata: Metadata = { title: 'Page not found · Caseflow' };

// Standalone fallback (no shell) for notFound() outside the (app) segment.
export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col">
      <ShellNotFound />
    </main>
  );
}
