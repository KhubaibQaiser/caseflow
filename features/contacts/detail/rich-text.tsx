import { Fragment } from 'react';
import type { ReactNode } from 'react';

import {
  isAllowedHref,
  type RichBlock,
  type RichDoc,
  type RichInline,
  type RichListItem,
} from '@/lib/contracts/rich-text-core';

// Walks the validated JSON into React elements. Text goes through React's escaping; nothing here
// builds HTML strings, so there is no innerHTML to get wrong.

function inline(node: RichInline, key: number): ReactNode {
  if (node.type === 'hardBreak') return <br key={key} />;
  let out: ReactNode = node.text;
  // The first mark is the outermost element.
  for (const mark of [...(node.marks ?? [])].reverse()) {
    if (mark.type === 'bold') out = <strong>{out}</strong>;
    else if (mark.type === 'italic') out = <em>{out}</em>;
    // The schema already refused other schemes; check again in case a document skipped it.
    else if (isAllowedHref(mark.attrs.href))
      out = (
        <a
          href={mark.attrs.href}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="text-accent underline decoration-1 underline-offset-3 hover:decoration-2"
        >
          {out}
        </a>
      );
  }
  return <Fragment key={key}>{out}</Fragment>;
}

function item(li: RichListItem, key: number): ReactNode {
  return <li key={key}>{li.content.map(block)}</li>;
}

function block(b: RichBlock, key: number): ReactNode {
  switch (b.type) {
    case 'paragraph':
      return <p key={key}>{b.content?.map(inline)}</p>;
    case 'bulletList':
      return (
        <ul key={key} className="list-disc ps-5">
          {b.content.map(item)}
        </ul>
      );
    case 'orderedList':
      return (
        <ol key={key} start={b.attrs?.start} className="list-decimal ps-5">
          {b.content.map(item)}
        </ol>
      );
  }
}

/** A note's formatted body. Blocks stack with a small gap; the caller sets the type size. */
export function RichText({ doc }: { doc: RichDoc }) {
  return (
    <div className="flex flex-col gap-1.5 [&_li>p]:m-0 [&_ol_ol]:mt-1 [&_ol_ul]:mt-1 [&_p]:m-0 [&_ul_ol]:mt-1 [&_ul_ul]:mt-1">
      {doc.content.map(block)}
    </div>
  );
}
