'use client';

import { ErrorContent } from './error-content';

// Root fallback: no shell here, so it supplies the main landmark itself.
export default function ErrorPage(props: {
  error: unknown;
  reset: () => void;
}) {
  return (
    <main className="flex flex-1 flex-col">
      <ErrorContent {...props} />
    </main>
  );
}
