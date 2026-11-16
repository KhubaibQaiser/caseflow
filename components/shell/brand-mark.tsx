import { cn } from '@/utils/cn';

export function BrandMark({ labelClassName }: { labelClassName?: string }) {
  return (
    <span className="text-accent flex items-center gap-2 text-base font-bold tracking-tight">
      <span
        aria-hidden
        className="bg-accent relative block size-[18px] shrink-0 rounded-[5px]"
      >
        <span className="border-on-accent absolute inset-x-1 inset-y-[5px] rounded-bl-[3px] border-b-2 border-l-2" />
      </span>
      <span className={cn(labelClassName)}>Caseflow</span>
    </span>
  );
}
