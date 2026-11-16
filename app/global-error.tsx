'use client';

import { Figtree } from 'next/font/google';
// global-error replaces the root layout, so it brings its own tokens and font (Next 16 error.md).
import './globals.css';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';

const figtree = Figtree({
  variable: '--font-sans-face',
  subsets: ['latin'],
  weight: ['400', '600'],
  display: 'swap',
});

// The root layout crashed: no router state worth keeping, so a full reload is the recovery.
export default function GlobalError({}: { error: unknown; reset: () => void }) {
  return (
    <html lang="en" className={`${figtree.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <title>Something broke · Caseflow</title>
        <meta name="robots" content="noindex" />
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
          <ErrorState
            page
            title="Something broke on our side."
            description="Caseflow didn't load. Reload the page."
            action={
              <Button
                variant="primary"
                onClick={() => window.location.reload()}
              >
                Reload
              </Button>
            }
          />
        </main>
      </body>
    </html>
  );
}
