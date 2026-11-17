import { headroomLayout } from '@/components/shell/headroom-layout';
import { listPageFrame } from '@/features/contacts/list/frame';
import {
  CardsSkeleton,
  TableSkeleton,
} from '@/features/contacts/list/table-skeleton';
import {
  HeaderSkeleton,
  ToolbarSkeleton,
} from '@/features/contacts/list/toolbar-skeleton';

/** Table-shaped: the same header, toolbar and 36px rows the list lands in, so nothing shifts. */
export default function ContactsLoading() {
  return (
    <div aria-busy="true" className={listPageFrame}>
      <span className="sr-only" role="status">
        Loading contacts
      </span>
      <div className={headroomLayout}>
        <HeaderSkeleton titleWidth="w-28" />
        <ToolbarSkeleton />
      </div>
      <TableSkeleton rows={12} className="hidden flex-1 md:block" />
      <CardsSkeleton rows={12} className="md:hidden" />
    </div>
  );
}
