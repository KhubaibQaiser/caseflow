import { FormSkeleton } from '@/features/contacts/form/form-skeleton';

// The list's skeleton lives in (list), so this page shows its own while it loads.
export default function Loading() {
  return <FormSkeleton />;
}
