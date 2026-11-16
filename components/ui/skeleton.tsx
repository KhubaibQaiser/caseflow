import { cn } from '@/utils/cn';

/** Decorative placeholder. The loading region itself carries aria-busy. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'from-skeleton via-skeleton-hi to-skeleton block h-2.5 animate-pulse rounded-[5px] bg-linear-to-r motion-reduce:animate-none forced-colors:border forced-colors:border-[GrayText]',
        className,
      )}
    />
  );
}
