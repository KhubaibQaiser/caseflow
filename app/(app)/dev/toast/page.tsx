import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { devRoutesEnabled } from '@/lib/env';

import { ToastButton } from './toast-button';

export const metadata: Metadata = { title: 'Toast · Caseflow' };

// Dev fixture: fires a toast inside the shell so e2e can check it clears the tab bar.
export default function DevToast() {
  if (!devRoutesEnabled()) notFound();
  return <ToastButton />;
}
