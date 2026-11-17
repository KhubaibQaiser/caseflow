import Link from 'next/link';

/** "Contacts / Name": ancestors are links, the last item is the current page. */
export function Breadcrumb({
  crumbs,
}: {
  crumbs: { label: string; href?: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="text-13 text-ink-2 m-0 flex list-none flex-wrap gap-x-1.5 p-0">
        {crumbs.map((c, i) => (
          <li key={c.label} className="flex min-w-0 gap-1.5">
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
  );
}
