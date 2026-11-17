import { cn } from '@/utils/cn';

export function BrandMark({ labelClassName }: { labelClassName?: string }) {
  return (
    <span className="text-accent flex items-center gap-2 text-base font-bold tracking-tight">
      <span
        aria-hidden
        className="bg-accent rounded-ctl relative block size-4.5 shrink-0"
      >
        <span className="border-on-accent absolute inset-x-1 inset-y-1.25 rounded-bl-xs border-b-2 border-l-2" />
      </span>
      <span className={cn(labelClassName)}>Caseflow</span>
    </span>
  );
}
