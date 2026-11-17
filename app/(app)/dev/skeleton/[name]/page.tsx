import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { devRoutesEnabled } from '@/lib/env';

import ContactLoading from '../../../contacts/[id]/(detail)/loading';
import ContactsLoading from '../../../contacts/(list)/loading';
import NewLoading from '../../../contacts/new/loading';
import PipelineLoading from '../../../pipeline/loading';

export const metadata: Metadata = { title: 'Skeleton · Caseflow' };

const SCREENS = {
  list: ContactsLoading,
  pipeline: PipelineLoading,
  detail: ContactLoading,
  form: NewLoading,
} as const;

// Dev fixture: a loading screen held on show, so e2e can measure it against the page it stands in for.
export default async function DevSkeleton({
  params,
}: PageProps<'/dev/skeleton/[name]'>) {
  if (!devRoutesEnabled()) notFound();
  const { name } = await params;
  const Screen = SCREENS[name as keyof typeof SCREENS];
  if (!Screen) notFound();
  return <Screen />;
}
