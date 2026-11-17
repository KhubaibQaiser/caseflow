import ChevronLeft from 'lucide-react/icons/chevron-left';
import Link from 'next/link';

import { ThemeToggle } from './theme-toggle';

/**
 * "Contacts / Name": ancestors are links, the last item is the current page. Below md it is a back
 * link only ("‹ Contacts", a 32px target): the page's own heading already names the current page.
 */
export function Breadcrumb({
  crumbs,
}: {
  crumbs: { label: string; href?: string }[];
}) {
  return (
    <div
      data-theme-slot
      className="flex min-h-8.5 items-center justify-between gap-2.5 max-md:min-h-0"
    >
      <nav aria-label="Breadcrumb">
        <ol className="text-13 text-ink-2 m-0 flex list-none flex-wrap gap-x-1.5 p-0">
          {crumbs.map((c, i) => (
            <li
              key={c.label}
              className={
                c.href
                  ? 'flex min-w-0 gap-1.5'
                  : 'flex min-w-0 gap-1.5 max-md:hidden'
              }
            >
              {i > 0 && <span aria-hidden>/</span>}
              {c.href ? (
                <Link
                  href={c.href}
                  className="text-accent rounded-ctl inline-flex items-center gap-0.5 underline-offset-3 hover:underline max-md:-my-1 max-md:-ms-1.5 max-md:min-h-8 max-md:ps-1 max-md:pe-2.5 max-md:font-semibold"
                >
                  <ChevronLeft aria-hidden className="size-4 md:hidden" />
                  {c.label}
                </Link>
              ) : (
                <span aria-current="page" className="max-w-[40ch] truncate">
                  {c.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <ThemeToggle className="max-md:hidden" />
    </div>
  );
}
