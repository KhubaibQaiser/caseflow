import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { devRoutesEnabled } from '@/lib/env';

import { Gallery } from './gallery';

export const metadata: Metadata = { title: 'Components · Caseflow' };

export default function ComponentsPage() {
  if (!devRoutesEnabled()) notFound();
  return <Gallery />;
}
