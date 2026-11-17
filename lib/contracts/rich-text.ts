import { z } from 'zod';

import './zod-config'; // jitless in the browser: the note editor parses with this schema under the CSP

import {
  NOTE_MAX_CHARS,
  isAllowedHref,
  richPlainText,
  type RichBlock,
  type RichDoc,
  type RichList,
  type RichListItem,
} from './rich-text-core';

export * from './rich-text-core';

// The only formatting a note may carry (Tiptap JSON): bold, italic, links, bullet and numbered
// lists, hard breaks. Everything is a strict object, so an unknown node, mark or attribute is
// rejected rather than stored. The server validates with this before anything is written.

const MAX_NODES = 500;
const MAX_LIST_DEPTH = 5;

const Href = z
  .string()
  .refine(isAllowedHref, 'Link must be http, https or mailto.');

// Tiptap's Link also serialises target, rel and class; accept only its own values and keep just the href.
const LinkMark = z.strictObject({
  type: z.literal('link'),
  attrs: z
    .strictObject({
      href: Href,
      target: z.literal('_blank').nullish(),
      rel: z.literal('noopener noreferrer nofollow').nullish(),
      class: z.null().nullish(),
    })
    .transform((a) => ({ href: a.href })),
});

const Mark = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('bold') }),
  z.strictObject({ type: z.literal('italic') }),
  LinkMark,
]);

const Text = z.strictObject({
  type: z.literal('text'),
  text: z.string().min(1).max(10_000),
  marks: z
    .array(Mark)
    .max(3)
    .refine(
      (m) => new Set(m.map((x) => x.type)).size === m.length,
      'Duplicate marks.',
    )
    .optional(),
});

const Inline = z.discriminatedUnion('type', [
  Text,
  z.strictObject({ type: z.literal('hardBreak') }),
]);

const Paragraph = z.strictObject({
  type: z.literal('paragraph'),
  content: z.array(Inline).max(200).optional(),
});

// Tiptap writes `start` (and `type: null`) on an ordered list; 1 is the default and is not kept.
const OrderedAttrs = z
  .strictObject({
    start: z.number().int().min(1).max(9999).optional(),
    type: z.null().optional(),
  })
  .transform((a) =>
    a.start && a.start !== 1 ? { start: a.start } : undefined,
  );

const List: z.ZodType<RichList, unknown> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.strictObject({
      type: z.literal('bulletList'),
      content: z.array(ListItem).min(1).max(100),
    }),
    z.strictObject({
      type: z.literal('orderedList'),
      attrs: OrderedAttrs.optional(),
      content: z.array(ListItem).min(1).max(100),
    }),
  ]),
);

const ListItem: z.ZodType<RichListItem, unknown> = z.lazy(() =>
  z.strictObject({
    type: z.literal('listItem'),
    content: z
      .array(z.union([Paragraph, List]))
      .min(1)
      .max(20)
      .refine(
        (c) => c[0]?.type === 'paragraph',
        'A list item starts with a paragraph.',
      ),
  }),
);

type Shape = { nodes: number; depth: number };
function measure(block: RichBlock, depth: number): Shape {
  if (block.type === 'paragraph')
    return { nodes: 1 + (block.content?.length ?? 0), depth };
  let nodes = 1;
  let deepest = depth + 1;
  for (const item of block.content) {
    nodes += 1;
    for (const child of item.content) {
      const m = measure(child, depth + 1);
      nodes += m.nodes;
      deepest = Math.max(deepest, m.depth);
    }
  }
  return { nodes, depth: deepest };
}

export const RichDocSchema: z.ZodType<RichDoc, unknown> = z
  .strictObject({
    type: z.literal('doc'),
    content: z
      .array(z.union([Paragraph, List]))
      .min(1)
      .max(200),
  })
  .refine((d) => {
    let nodes = 1;
    let depth = 0;
    for (const b of d.content) {
      const m = measure(b, 0);
      nodes += m.nodes;
      depth = Math.max(depth, m.depth);
    }
    return nodes <= MAX_NODES && depth <= MAX_LIST_DEPTH;
  }, 'Too large or too deeply nested.');

// A cheap, non-recursive look at the raw value before Zod sees it: Zod's lazy list parser recurses,
// so thousands of nested levels would overflow the stack before any depth rule ran.
const MAX_JSON_DEPTH = 64;
const MAX_JSON_NODES = 5_000;

function withinLimits(raw: unknown): boolean {
  const stack: { value: unknown; depth: number }[] = [{ value: raw, depth: 1 }];
  let seen = 0;
  while (stack.length > 0) {
    const { value, depth } = stack.pop()!;
    if (typeof value !== 'object' || value === null) continue;
    if (depth > MAX_JSON_DEPTH || ++seen > MAX_JSON_NODES) return false;
    for (const child of Object.values(value))
      stack.push({ value: child, depth: depth + 1 });
  }
  return true;
}

/**
 * RichDocSchema.safeParse behind the same pre-walk and a catch: for every document that did not come
 * from our own editor (a form post, a stored row, a restored draft). Never throws.
 */
export function safeParseRichDoc(
  raw: unknown,
): { success: true; data: RichDoc } | { success: false } {
  try {
    if (!withinLimits(raw)) return { success: false };
    const p = RichDocSchema.safeParse(raw);
    return p.success ? { success: true, data: p.data } : { success: false };
  } catch {
    return { success: false };
  }
}

export type RichNoteResult =
  { ok: true; doc: RichDoc; text: string } | { ok: false; message: string };

const NOT_ALLOWED: RichNoteResult = {
  ok: false,
  message: "That formatting isn't allowed.",
};

/** Validates a note from the browser and derives the plain text stored beside it. Messages never echo the input; nothing thrown escapes. */
export function parseRichNote(raw: unknown): RichNoteResult {
  try {
    const p = safeParseRichDoc(raw);
    if (!p.success) return NOT_ALLOWED;
    const text = richPlainText(p.data).trim();
    if (text === '') return { ok: false, message: 'Write a note.' };
    if (text.length > NOTE_MAX_CHARS)
      return {
        ok: false,
        message: `Note must be ${NOTE_MAX_CHARS} characters or fewer.`,
      };
    return { ok: true, doc: p.data, text };
  } catch {
    return NOT_ALLOWED;
  }
}
