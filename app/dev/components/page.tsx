import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Gallery } from './gallery';

export const metadata: Metadata = { title: 'Components · Caseflow' };

export default function ComponentsPage() {
  if (process.env.VERCEL_ENV === 'production') notFound();
  return <Gallery />;
}
