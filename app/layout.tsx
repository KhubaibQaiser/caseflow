import type { Metadata, Viewport } from 'next';
import { Figtree } from 'next/font/google';
import { cookies } from 'next/headers';
import { connection } from 'next/server';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import './globals.css';

import { Toaster } from '@/components/ui/toaster';
import { THEME_COOKIE, parseTheme, themeAttr } from '@/lib/theme';
import { THEME_COLOR_DARK, THEME_COLOR_LIGHT } from '@/lib/theme-colors';

const figtree = Figtree({
  variable: '--font-sans-face',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Caseflow',
  description: 'Legal intake, without the spreadsheet.',
};

// cover lets the tab bar's safe-area padding see the home indicator.
export const viewport: Viewport = {
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: THEME_COLOR_LIGHT },
    { media: '(prefers-color-scheme: dark)', color: THEME_COLOR_DARK },
  ],
};

// Opt every route into dynamic rendering: the CSP nonce is per request, and a prerendered page can't carry one.
export default async function RootLayout({ children }: LayoutProps<'/'>) {
  await connection();
  // No attribute for System: CSS prefers-color-scheme decides. No inline script, so the nonce CSP is untouched.
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html
      lang="en"
      data-theme={themeAttr(theme)}
      className={`${figtree.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <NuqsAdapter>{children}</NuqsAdapter>
        <Toaster />
      </body>
    </html>
  );
}
