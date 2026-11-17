import Link from 'next/link';
import type { ReactNode } from 'react';

import { PageHeading } from '@/components/ui/page-heading';

/** Breadcrumb and heading shared by the create and edit pages. */
export function FormPage({
  crumbs,
  title,
  children,
}: {
  crumbs: { label: string; href?: string }[];
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1.5">
        <nav aria-label="Breadcrumb">
          <ol className="text-13 text-ink-2 m-0 flex list-none flex-wrap gap-x-1.5 p-0">
            {crumbs.map((c, i) => (
              <li key={c.label} className="flex gap-1.5">
                {i > 0 && <span aria-hidden>/</span>}
                {c.href ? (
                  <Link
                    href={c.href}
                    className="text-accent underline-offset-3 hover:underline"
                  >
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
        <PageHeading className="text-ink m-0 text-xl font-semibold tracking-tight md:text-2xl">
          {title}
        </PageHeading>
      </div>
      {children}
    </div>
  );
}
