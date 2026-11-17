import type { Metadata, Viewport } from 'next';
import { Figtree } from 'next/font/google';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import './globals.css';

import { Toaster } from '@/components/ui/toaster';

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
export const viewport: Viewport = { viewportFit: 'cover' };

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${figtree.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <NuqsAdapter>{children}</NuqsAdapter>
        <Toaster />
      </body>
    </html>
  );
}
